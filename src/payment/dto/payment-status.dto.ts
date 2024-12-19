import { IsString, IsBoolean, IsObject, IsEmail } from 'class-validator'

export enum PaymentEventStatus {
	WAITING = 'payment.waiting_for_capture',
	SUCCESSED = 'payment.succeeded',
	CANCELED = 'payment.canceled'
}

class AmountDto {
	@IsString()
	value: string

	@IsString()
	currency: string
}

class MetadataDto {
	@IsEmail()
	email: string

	@IsString()
	order: string
}

class PaymentMethodDto {
	@IsString()
	id: string

	@IsString()
	type: string

	@IsBoolean()
	saved: boolean

	@IsString()
	title: string

	@IsObject()
	card: object
}

class PaymentObjectDto {
	@IsString()
	id: string

	@IsString()
	status: string

	@IsObject()
	amount: AmountDto

	@IsString()
	description: string

	@IsObject()
	metadata: MetadataDto

	@IsObject()
	payment_method: PaymentMethodDto

	@IsString()
	created_at: string

	@IsString()
	expires_at: string

	@IsBoolean()
	paid: boolean
}

export class PaymentStatusDto {
	@IsString()
	type: string

	@IsString()
	event: PaymentEventStatus

	@IsObject()
	object: PaymentObjectDto
}
