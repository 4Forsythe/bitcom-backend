import { IsString } from 'class-validator'

export class OrderVerifyDto {
	@IsString()
	code: string

	@IsString()
	userId: string

	@IsString()
	orderId: string
}
