import {
	IsString,
	IsBoolean,
	IsOptional,
	MaxLength,
	MinLength,
	IsEmail,
	IsPhoneNumber
} from 'class-validator'

export class CreateUserDto {
	@IsString()
	@IsOptional()
	@MaxLength(48)
	name?: string

	@IsEmail()
	email: string

	@IsPhoneNumber('RU')
	@IsOptional()
	phone?: string

	@IsString()
	@IsOptional()
	@MinLength(5)
	@MaxLength(32)
	password?: string

	@IsBoolean()
	@IsOptional()
	isSubscribed?: boolean
}
