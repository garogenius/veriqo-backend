import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsEnum, IsNotEmpty } from 'class-validator';
import { ApiEnvironment } from '@prisma/client';

export class CreateApiKeyDto {
  @ApiProperty({ description: 'The ID of the API Client this key belongs to' })
  @IsString()
  @IsNotEmpty()
  apiClientId: string;

  @ApiProperty({ enum: ApiEnvironment, description: 'Environment (SANDBOX or PRODUCTION)' })
  @IsEnum(ApiEnvironment)
  environment: ApiEnvironment;

  @ApiProperty({ type: [String], description: 'List of scopes this API Key has access to', example: ['transactions:read', 'transactions:write'] })
  @IsArray()
  @IsString({ each: true })
  scopes: string[];
}
