import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Users')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('v1/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@Request() req: any) {
    const user = await this.usersService.findById(req.user.id);
    if (user) {
      // Exclude passwordHash and normalizedEmail before returning
      const { passwordHash, normalizedEmail, ...safeUser } = user;
      return safeUser;
    }
    return null;
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update personal details' })
  async updateProfile(@Request() req: any, @Body() updateProfileDto: UpdateProfileDto) {
    const updatedUser = await this.usersService.update(req.user.id, updateProfileDto);
    const { passwordHash, normalizedEmail, ...safeUser } = updatedUser;
    return safeUser;
  }

  @Patch('me/password')
  @ApiOperation({ summary: 'Update password' })
  async updatePassword(@Request() req: any, @Body() updatePasswordDto: UpdatePasswordDto) {
    await this.usersService.updatePassword(req.user.id, updatePasswordDto);
    return { message: 'Password updated successfully' };
  }
}
