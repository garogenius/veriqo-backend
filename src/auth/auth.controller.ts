import { Controller, Post, Body, HttpCode, HttpStatus, Ip, Headers, Get, UseGuards, Request, Delete, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto, VerifyTokenDto, RefreshTokenDto } from './dto/auth-actions.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Throttle({ default: { limit: 10, ttl: 60000 } }) // map default throttler strictly
@Controller('v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    // In a real scenario, this endpoint should also create the organization
    // for the user right after registration, based on the onboarding requirements.
    // We will expand on this when we implement the Organization module.
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.authService.login(loginDto, ipAddress, userAgent);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(@Request() req: any) {
    await this.authService.logout(req.user.sessionId);
    return { success: true, message: 'Successfully logged out' };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.authService.refresh(dto.refreshToken, ipAddress, userAgent);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyTokenDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body() dto: ForgotPasswordDto) { // Reusing email dto
    return this.authService.resendVerification(dto.email);
  }

  @Post('verify-phone')
  @HttpCode(HttpStatus.OK)
  async verifyPhone(@Body() dto: VerifyTokenDto) {
    return this.authService.verifyPhone(dto.token);
  }

  @Post('resend-phone-verification')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async resendPhoneVerification(@Request() req: any) {
    return this.authService.resendPhoneVerification(req.user.id);
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  async getSessions(@Request() req: any) {
    const sessions = await this.authService.getSessions(req.user.id);
    return { success: true, data: sessions };
  }

  @Delete('sessions/:id')
  @UseGuards(JwtAuthGuard)
  async revokeSession(@Request() req: any, @Param('id') id: string) {
    await this.authService.revokeSession(req.user.id, id);
    return { success: true, message: 'Session revoked' };
  }

  @Delete('sessions')
  @UseGuards(JwtAuthGuard)
  async revokeAllSessions(@Request() req: any) {
    await this.authService.revokeAllSessions(req.user.id);
    return { success: true, message: 'All sessions revoked' };
  }
}
