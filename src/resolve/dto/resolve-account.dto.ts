import { IsString, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class InstitutionDto {
  @ApiProperty({ example: '058' })
  @IsString()
  @IsNotEmpty()
  code: string;
}

class AccountDto {
  @ApiProperty({ example: '0123456789' })
  @IsString()
  @IsNotEmpty()
  number: string;
}

export class ResolveAccountDto {
  @ApiProperty({ example: 'NG' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({ type: InstitutionDto })
  @ValidateNested()
  @Type(() => InstitutionDto)
  @IsNotEmpty()
  institution: InstitutionDto;

  @ApiProperty({ type: AccountDto })
  @ValidateNested()
  @Type(() => AccountDto)
  @IsNotEmpty()
  account: AccountDto;
}
