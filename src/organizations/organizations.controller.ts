import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
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
    // strict ownership enforcement happens in service
    return this.orgService.findById(id, req.user.id);
  }
}
