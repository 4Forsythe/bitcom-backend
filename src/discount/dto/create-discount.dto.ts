import {
	IsArray,
	IsNumber,
	IsString,
	IsBoolean,
	IsOptional
} from 'class-validator'

export class CreateDiscountDto {
	@IsString()
	name: string

	@IsString()
	type: string

	@IsNumber()
	amount: number

	@IsNumber()
	priority: number

	@IsBoolean()
	@IsOptional()
	isArchived?: boolean

	@IsArray()
	@IsString({ each: true })
	@IsOptional()
	products: string[]

	@IsString()
	@IsOptional()
	categoryId?: string

	@IsString()
	startedAt: string

	@IsString()
	expiresAt: string
}
