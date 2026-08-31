import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { PrismaService } from '../prisma/prisma.service';
import { OrgType, Prisma } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await argon2.hash(registerDto.password);

    // Run the entire onboarding flow in a transaction to prevent orphaned accounts
    const result = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Create the User
      const user = await tx.user.create({
        data: {
          firstName: registerDto.firstName,
          lastName: registerDto.lastName,
          email: registerDto.email,
          normalizedEmail: registerDto.email.toLowerCase(),
          phoneNumber: registerDto.phoneNumber,
          passwordHash,
        }
      });

      // 2. Resolve organization type
      let orgType: OrgType;
      switch (registerDto.organizationType.toUpperCase()) {
        case 'BANK': orgType = OrgType.BANK; break;
        case 'FINTECH': orgType = OrgType.FINTECH; break;
        case 'BUSINESS': orgType = OrgType.BUSINESS; break;
        default: orgType = OrgType.OTHER; break;
      }

      // 3. Create the Organization
      const organization = await tx.organization.create({
        data: {
          name: registerDto.organizationName,
          organizationType: orgType,
          country: registerDto.country,
          ownerId: user.id,
        }
      });

      // 4. Create the standard Admin Role if it doesn't exist (or just bypass roles for now by hardcoding a dummy role)
      // Since roles are dynamic, we will assume a generic 'OWNER' role is attached, 
      // but for simplicity in this migration, we'll create the role dynamically if missing.
      let ownerRole = await tx.role.findUnique({ where: { name: 'OWNER' } });
      if (!ownerRole) {
        ownerRole = await tx.role.create({
          data: { name: 'OWNER', description: 'Organization Owner' }
        });
      }

      // 5. Create OrganizationMembership
      await tx.organizationMembership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          roleId: ownerRole.id,
        }
      });

      // 6. Automatically provision a Sandbox API Client and API Key for quick developer testing
      const apiClient = await tx.apiClient.create({
        data: {
          organizationId: organization.id,
          name: 'Default Sandbox App',
          environment: 'SANDBOX',
          createdById: user.id,
        }
      });

      const rawSecret = crypto.randomBytes(32).toString('hex');
      const secretHash = await argon2.hash(rawSecret);

      const apiKey = await tx.apiKey.create({
        data: {
          apiClientId: apiClient.id,
          publicIdentifier: `vrq_test_${crypto.randomBytes(8).toString('hex')}`,
          secretHash,
          environment: 'SANDBOX',
          scopes: ['transactions:write', 'resolve:read', 'proof:write'],
        }
      });

      return { user, organization, apiKey: { ...apiKey, rawSecret } };
    });

    const payload = { sub: result.user.id, email: result.user.email };
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: { id: result.user.id, email: result.user.email, firstName: result.user.firstName },
      organization: { id: result.organization.id, name: result.organization.name },
      api_key: result.apiKey.rawSecret, // Show the secret ONLY ONCE during registration!
      public_identifier: result.apiKey.publicIdentifier,
    };
  }

  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await this.usersService.findByEmail(loginDto.email);
    
    // 1. Account Lockout Check
    if (user && user.status === 'SUSPENDED') {
      await this.logAttempt(loginDto.email, false, ipAddress, userAgent, 'ACCOUNT_LOCKED');
      throw new UnauthorizedException('Account is locked. Please contact support.');
    }

    // 2. Progressive Protection: Check failed attempts in last 15 minutes
    const recentFailures = await this.prisma.loginAttempt.count({
      where: {
        email: loginDto.email,
        success: false,
        createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) }
      }
    });

    if (recentFailures >= 5) {
      if (user) {
        await this.prisma.user.update({ where: { id: user.id }, data: { status: 'SUSPENDED' }});
        await this.logSecurityEvent(null, user.id, 'ACCOUNT_LOCKED', 'HIGH');
      }
      throw new UnauthorizedException('Too many failed attempts. Account locked.');
    }

    if (!user) {
      await this.logAttempt(loginDto.email, false, ipAddress, userAgent, 'USER_NOT_FOUND');
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, loginDto.password);
    if (!isPasswordValid) {
      await this.logAttempt(loginDto.email, false, ipAddress, userAgent, 'INVALID_PASSWORD');
      await this.logSecurityEvent(null, user.id, 'LOGIN_FAILED', 'LOW');
      throw new UnauthorizedException('Invalid credentials');
    }

    // 3. Login Successful
    await this.logAttempt(loginDto.email, true, ipAddress, userAgent);
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await this.logSecurityEvent(null, user.id, 'LOGIN_SUCCESS', 'INFO');

    // 4. Create Session and Refresh Token
    const rawRefreshToken = crypto.randomBytes(32).toString('hex');
    const refreshTokenHash = await argon2.hash(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash,
        expiresAt,
        ipAddress,
        userAgent,
      }
    });

    const payload = { sub: user.id, email: user.email, sessionId: session.id };
    
    return {
      access_token: await this.jwtService.signAsync(payload),
      refresh_token: rawRefreshToken,
      user: { id: user.id, email: user.email, firstName: user.firstName, mfaEnabled: user.mfaEnabled },
    };
  }

  async refresh(refreshToken: string, ipAddress?: string, userAgent?: string) {
    // 1. Find all active sessions
    const sessions = await this.prisma.session.findMany({
      where: { status: 'ACTIVE', expiresAt: { gt: new Date() } },
      include: { user: true }
    });

    let validSession = null;
    let user = null;

    // 2. Verify hash
    for (const session of sessions) {
      if (await argon2.verify(session.refreshTokenHash, refreshToken)) {
        validSession = session;
        user = session.user;
        break;
      }
    }

    if (!validSession || !user) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // 3. Rotate Refresh Token
    const rawRefreshToken = crypto.randomBytes(32).toString('hex');
    const refreshTokenHash = await argon2.hash(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.prisma.session.update({
      where: { id: validSession.id },
      data: {
        refreshTokenHash,
        expiresAt,
        ipAddress,
        userAgent,
      }
    });

    const payload = { sub: user.id, email: user.email, sessionId: validSession.id };
    
    return {
      access_token: await this.jwtService.signAsync(payload),
      refresh_token: rawRefreshToken,
    };
  }

  async logout(sessionId: string) {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { status: 'REVOKED' }
    });
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) return; // Do not reveal if user exists

    const tokenRaw = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    await this.prisma.token.create({
      data: {
        userId: user.id,
        type: 'PASSWORD_RESET',
        token: tokenRaw,
        expiresAt
      }
    });

    // In a real app, send email here.
    return { message: 'If this email is registered, a password reset link has been sent.' };
  }

  async resetPassword(token: string, newPasswordRaw: string) {
    const tokenRecord = await this.prisma.token.findUnique({ where: { token } });
    if (!tokenRecord || tokenRecord.type !== 'PASSWORD_RESET' || tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const passwordHash = await argon2.hash(newPasswordRaw);

    await this.prisma.user.update({
      where: { id: tokenRecord.userId },
      data: { passwordHash }
    });

    // Delete token after use
    await this.prisma.token.delete({ where: { id: tokenRecord.id } });
    
    // Revoke all sessions for security
    await this.prisma.session.updateMany({
      where: { userId: tokenRecord.userId },
      data: { status: 'REVOKED' }
    });

    await this.logSecurityEvent(null, tokenRecord.userId, 'PASSWORD_CHANGED', 'INFO');

    return { message: 'Password successfully reset' };
  }

  async verifyEmail(token: string) {
    const tokenRecord = await this.prisma.token.findUnique({ where: { token } });
    if (!tokenRecord || tokenRecord.type !== 'EMAIL_VERIFICATION' || tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    await this.prisma.user.update({
      where: { id: tokenRecord.userId },
      data: { 
        emailVerifiedAt: new Date(),
        onboardingStatus: 'EMAIL_VERIFIED' 
      }
    });

    await this.prisma.token.delete({ where: { id: tokenRecord.id } });
    return { message: 'Email successfully verified' };
  }

  async resendVerification(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || user.emailVerifiedAt) return { message: 'Verification email sent' };

    const tokenRaw = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.prisma.token.create({
      data: {
        userId: user.id,
        type: 'EMAIL_VERIFICATION',
        token: tokenRaw,
        expiresAt
      }
    });

    return { message: 'Verification email sent' };
  }

  async verifyPhone(token: string) {
    const tokenRecord = await this.prisma.token.findUnique({ where: { token } });
    if (!tokenRecord || tokenRecord.type !== 'PHONE_VERIFICATION' || tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    await this.prisma.user.update({
      where: { id: tokenRecord.userId },
      data: { phoneVerifiedAt: new Date() }
    });

    await this.prisma.token.delete({ where: { id: tokenRecord.id } });
    return { message: 'Phone successfully verified' };
  }

  async resendPhoneVerification(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user || user.phoneVerifiedAt) return { message: 'Verification SMS sent' };

    const tokenRaw = crypto.randomBytes(4).toString('hex'); // shorter for SMS
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000);

    await this.prisma.token.create({
      data: {
        userId: user.id,
        type: 'PHONE_VERIFICATION',
        token: tokenRaw,
        expiresAt
      }
    });

    return { message: 'Verification SMS sent' };
  }

  async getSessions(userId: string) {
    return this.prisma.session.findMany({
      where: { userId, status: 'ACTIVE' },
      select: { id: true, ipAddress: true, userAgent: true, createdAt: true, expiresAt: true }
    });
  }

  async revokeSession(userId: string, sessionId: string) {
    await this.prisma.session.updateMany({
      where: { id: sessionId, userId },
      data: { status: 'REVOKED' }
    });
  }

  async revokeAllSessions(userId: string) {
    await this.prisma.session.updateMany({
      where: { userId, status: 'ACTIVE' },
      data: { status: 'REVOKED' }
    });
  }

  private async logAttempt(email: string, success: boolean, ipAddress?: string, userAgent?: string, reason?: string) {
    try {
      await this.prisma.loginAttempt.create({
        data: { email, success, ipAddress, userAgent }
      });
    } catch (e) {
      // Don't fail the request if logging fails
    }
  }

  private async logSecurityEvent(organizationId: string | null, userId: string | null, eventType: string, severity: string) {
    try {
      await this.prisma.securityEvent.create({
        data: { organizationId, userId, eventType, severity }
      });
    } catch (e) {
      // Don't fail the request if logging fails
    }
  }
}
