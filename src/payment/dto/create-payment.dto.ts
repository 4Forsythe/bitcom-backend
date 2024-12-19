import {
	IsNumber,
	IsString,
	IsEmail,
	IsOptional,
	IsUrl,
	IsPhoneNumber,
	MaxLength,
	IsObject,
	IsArray,
	IsInt
} from 'class-validator'

class AmountDto {
	@IsNumber()
	value: number

	@IsString()
	currency: string
}

class CustomerDto {
	@IsString()
	@IsOptional()
	name?: string

	@IsEmail()
	@IsOptional()
	email?: string

	@IsPhoneNumber()
	@IsOptional()
	phone?: string
}

class ItemDto {
	@IsObject()
	amount: AmountDto

	@IsString()
	description: string

	@IsInt()
	quantity: number

	@IsInt()
	vat_code: number
}

export class CreatePaymentDto {
	@IsObject()
	amount: AmountDto

	@IsString()
	@MaxLength(128)
	description: string

	@IsObject()
	customer: CustomerDto

	@IsString()
	order: string

	@IsArray()
	items: ItemDto[]

	@IsUrl()
	returnUrl: string
}
