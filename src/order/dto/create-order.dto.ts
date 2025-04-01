import {
	IsEmail,
	IsString,
	IsObject,
	IsOptional,
	IsPhoneNumber,
	MinLength,
	MaxLength
} from 'class-validator'

export enum OrderStatus {
	PENDING = 'Обрабатывается',
	WAITING = 'Ожидает подтверждения',
	PAYED = 'Оплачен',
	CANCELED = 'Отменен',
	CREATED = 'Создан',
	PROCESSING = 'Собирается',
	READY = 'Готов к выдаче'
}

export enum OrderGettingMethod {
	PICKUP = 'Самовывоз'
}

export enum OrderPaymentMethod {
	CARD = 'Банковской картой онлайн',
	CASH = 'При получении'
}

class CustomerNameDto {
	@IsString()
	@MinLength(2)
	@MaxLength(50)
	firstName: string

	@IsString()
	@MinLength(2)
	@MaxLength(50)
	lastName: string

	@IsString()
	@IsOptional()
	@MaxLength(50)
	middleName?: string
}

export class CreateOrderDto {
	@IsObject()
	customerName: CustomerNameDto

	@IsEmail()
	customerEmail: string

	@IsPhoneNumber('RU', { message: 'Только российские номера телефонов' })
	customerPhone: string

	@IsString()
	@IsOptional()
	address?: string

	@IsString()
	@IsOptional()
	comment?: string

	@IsString()
	@IsOptional()
	paymentId?: string

	@IsString()
	@IsOptional()
	status?: OrderStatus

	@IsString()
	gettingMethod: OrderGettingMethod

	@IsString()
	paymentMethod: OrderPaymentMethod
}
