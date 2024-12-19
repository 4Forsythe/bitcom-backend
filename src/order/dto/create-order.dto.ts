import {
	IsEmail,
	IsString,
	MinLength,
	MaxLength,
	IsOptional,
	IsPhoneNumber,
	IsNumber,
	IsObject,
	IsDecimal,
	IsInt,
	IsArray
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

export class CreateOrderDto {
	@IsString()
	@MinLength(5)
	@MaxLength(144)
	customerName: string

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
