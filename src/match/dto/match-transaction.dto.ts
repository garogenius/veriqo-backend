import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MatchTransactionDto {
  @ApiProperty({ example: 'exp_pay_12345' })
  @IsString()
  @IsNotEmpty()
  expectedPaymentId: string;

  @ApiProperty({ example: 'txn_98765' })
  @IsString()
  @IsNotEmpty()
  transactionId: string;
}
