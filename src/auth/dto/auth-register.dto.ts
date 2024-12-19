import {
	IsEmail,
	IsString,
	IsOptional,
	MaxLength,
	MinLength
} from 'class-validator'

export class AuthRegisterDto {
	@IsString()
	@IsOptional()
	@MaxLength(48)
	name?: string

	@IsEmail()
	email: string

	@IsString()
	@MinLength(4)
	@MaxLength(32)
	password: string
}
