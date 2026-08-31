import { Controller, Post, Delete, Param, UseGuards, Request } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('v1/invitations')
export class InvitationsController {
  constructor(private readonly orgService: OrganizationsService) {}

  @Post(':token/accept')
  @UseGuards(JwtAuthGuard) // Requires a logged in user to accept
  async acceptInvitation(@Request() req: any, @Param('token') token: string) {
    return this.orgService.acceptInvitation(token, req.user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteInvitation(@Request() req: any, @Param('id') id: string) {
    return this.orgService.deleteInvitation(id, req.user.id);
  }
}
