import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { OrgType } from '@prisma/client';

export class CreateOrgDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(OrgType)
  @IsNotEmpty()
  type: OrgType;

  @IsString()
  @IsNotEmpty()
  country: string;
}
