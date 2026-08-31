import { Controller, Post, Get, Patch, Delete, Body, Param, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrgDto } from './dto/create-org.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Organizations')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('v1/organizations')
export class OrganizationsController {
  constructor(private readonly orgService: OrganizationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new organization' })
  async create(@Request() req: any, @Body() createOrgDto: CreateOrgDto) {
    return this.orgService.create(req.user.id, createOrgDto);
  }

  @Get('current')
  @ApiOperation({ summary: 'Get current active organization' })
  async findCurrent(@Request() req: any) {
    return this.orgService.findCurrent(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an organization by ID' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.orgService.findById(id, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List all organizations for the user' })
  async findAll(@Request() req: any) {
    return this.orgService.findAll(req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update organization details' })
  async update(@Request() req: any, @Param('id') id: string, @Body() updateDto: any) {
    return this.orgService.update(id, req.user.id, updateDto);
  }

  @Patch(':id/settings')
  @ApiOperation({ summary: 'Update organization settings' })
  async updateSettings(@Request() req: any, @Param('id') id: string, @Body() settings: any) {
    return this.orgService.updateSettings(id, req.user.id, settings);
  }

  @Delete(':id')
  async remove(@Request() req: any, @Param('id') id: string) {
    return this.orgService.remove(id, req.user.id);
  }

  // --- Members ---
  @Get(':id/members')
  async getMembers(@Request() req: any, @Param('id') id: string) {
    return this.orgService.getMembers(id, req.user.id);
  }

  @Post(':id/members')
  async addMember(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.orgService.addMember(id, req.user.id, body);
  }

  @Patch(':id/members/:memberId')
  async updateMember(@Request() req: any, @Param('id') orgId: string, @Param('memberId') memberId: string, @Body() body: any) {
    return this.orgService.updateMember(orgId, req.user.id, memberId, body);
  }

  @Delete(':id/members/:memberId')
  async removeMember(@Request() req: any, @Param('id') orgId: string, @Param('memberId') memberId: string) {
    return this.orgService.removeMember(orgId, req.user.id, memberId);
  }

  // --- Invitations ---
  @Post(':id/invitations')
  @ApiOperation({ summary: 'Invite a user to the organization' })
  async inviteMember(@Request() req: any, @Param('id') orgId: string, @Body() body: any) {
    return this.orgService.inviteMember(orgId, req.user.id, body);
  }

  @Get(':id/invitations')
  @ApiOperation({ summary: 'List pending invitations' })
  async getInvitations(@Request() req: any, @Param('id') orgId: string) {
    const invites = await this.orgService.getInvitations(orgId, req.user.id);
    // Do not expose invitation token secrets in list responses (Part D)
    return invites.map((invite: any) => {
      const { token, ...safeInvite } = invite;
      return safeInvite;
    });
  }

  @Get(':id/invitations/:invitationId')
  @ApiOperation({ summary: 'Get a specific invitation' })
  async getInvitation(@Request() req: any, @Param('id') orgId: string, @Param('invitationId') invitationId: string) {
    const invite = await this.orgService.getInvitation(orgId, req.user.id, invitationId);
    const { token, ...safeInvite } = invite as any;
    return safeInvite;
  }

  @Post(':id/invitations/:invitationId/resend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend an invitation' })
  async resendInvitation(@Request() req: any, @Param('id') orgId: string, @Param('invitationId') invitationId: string) {
    const invite = await this.orgService.resendInvitation(orgId, req.user.id, invitationId);
    return { success: true, message: 'Invitation resent successfully.' };
  }
}
