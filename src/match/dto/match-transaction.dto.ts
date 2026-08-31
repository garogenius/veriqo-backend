import { IsString, IsNotEmpty, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MatchTransactionDto {
  @ApiProperty({ example: 'INV-10092' })
  @IsString()
  @IsNotEmpty()
  reference: string;

  @ApiProperty({ example: 250000 })
  @IsNumber()
  @IsNotEmpty()
  expected_amount: number;

  @ApiProperty({ example: 'NGN' })
  @IsString()
  @IsNotEmpty()
  currency: string;
}
