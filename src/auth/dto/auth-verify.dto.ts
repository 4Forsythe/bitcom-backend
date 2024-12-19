import { IsString } from 'class-validator'

export class AuthVerifyDto {
	@IsString()
	code: string

	@IsString()
	userId: string
}
