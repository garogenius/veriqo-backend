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

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, loginDto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Optionally update lastLoginAt here using a background event/queue.
    
    const payload = { sub: user.id, email: user.email };
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: { id: user.id, email: user.email, firstName: user.firstName },
    };
  }
}
