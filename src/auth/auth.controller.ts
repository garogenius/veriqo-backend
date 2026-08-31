import { Controller, Post, Body, HttpCode, HttpStatus, Ip, Headers } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

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
  async logout() {
    // Session invalidation logic (e.g., blocklist token or clear secure cookie)
    return { message: 'Successfully logged out' };
  }
}
