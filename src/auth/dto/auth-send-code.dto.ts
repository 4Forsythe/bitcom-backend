import { IsEmail } from 'class-validator'

export class AuthSendCodeDto {
	@IsEmail()
	email: string
}
