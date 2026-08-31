import { IsString, IsNotEmpty, IsUrl, IsArray, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ApiEnvironment } from '@prisma/client';

export class CreateWebhookDto {
  @ApiProperty({ example: 'https://api.fintech.com/webhooks/veriqo' })
  @IsUrl()
  @IsNotEmpty()
  url: string;

  @ApiProperty({ example: ['transaction.verified', 'account.resolved'] })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  events: string[];

  @ApiProperty({ example: 'SANDBOX', enum: ApiEnvironment })
  @IsEnum(ApiEnvironment)
  @IsNotEmpty()
  environment: ApiEnvironment;
}
