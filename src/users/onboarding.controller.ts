import { Controller, Get, Patch, Post, Body, UseGuards, Request } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('v1/onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get('status')
  async getStatus(@Request() req: any) {
    return this.onboardingService.getStatus(req.user.id);
  }

  @Patch('profile')
  async updateProfile(@Request() req: any, @Body() body: any) {
    return this.onboardingService.updateProfile(req.user.id, body);
  }

  @Patch('organization')
  async updateOrganization(@Request() req: any, @Body() body: any) {
    return this.onboardingService.updateOrganization(req.user.id, body);
  }

  @Post('complete')
  async completeOnboarding(@Request() req: any) {
    return this.onboardingService.completeOnboarding(req.user.id);
  }
}
