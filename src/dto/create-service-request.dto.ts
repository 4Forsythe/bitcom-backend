import {
	IsString,
	IsOptional,
	IsEmail,
	IsPhoneNumber,
	MinLength,
	MaxLength
} from 'class-validator'

export class CreateServiceRequestDto {
	@IsString()
	@MinLength(2)
	@MaxLength(50)
	name: string

	@IsEmail()
	email: string

	@IsPhoneNumber('RU')
	phone: string

	@IsString()
	@MinLength(32)
	@MaxLength(720)
	request: string

	@IsString()
	@IsOptional()
	@MaxLength(5200)
	comment?: string
}
