import { Controller, Post, Get, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { CreateOrgDto } from './dto/create-org.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('v1/organizations')
export class OrganizationsController {
  constructor(private readonly orgService: OrganizationsService) {}

  @Post()
  async create(@Request() req: any, @Body() createOrgDto: CreateOrgDto) {
    return this.orgService.create(req.user.id, createOrgDto);
  }

  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.orgService.findById(id, req.user.id);
  }

  @Get()
  async findAll(@Request() req: any) {
    return this.orgService.findAll(req.user.id);
  }

  @Patch(':id')
  async update(@Request() req: any, @Param('id') id: string, @Body() updateDto: any) {
    return this.orgService.update(id, req.user.id, updateDto);
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
  async inviteMember(@Request() req: any, @Param('id') orgId: string, @Body() body: any) {
    return this.orgService.inviteMember(orgId, req.user.id, body);
  }

  @Get(':id/invitations')
  async getInvitations(@Request() req: any, @Param('id') orgId: string) {
    return this.orgService.getInvitations(orgId, req.user.id);
  }
}
