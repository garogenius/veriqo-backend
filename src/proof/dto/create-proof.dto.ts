import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProofDto {
  @ApiProperty({ example: 'ver_xxxxx' })
  @IsString()
  @IsNotEmpty()
  verification_id: string;
}
