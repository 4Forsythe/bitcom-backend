import {
	IsInt,
	IsNumber,
	IsString,
	IsOptional,
	IsArray,
	IsBoolean
} from 'class-validator'

export class CreateProductDto {
	@IsString()
	name: string

	@IsString()
	@IsOptional()
	description?: string

	@IsInt()
	@IsOptional()
	count?: number

	@IsNumber()
	price: number

	@IsNumber()
	@IsOptional()
	discountPrice?: number

	@IsArray()
	@IsString({ each: true })
	@IsOptional()
	sku?: string[]

	@IsNumber()
	@IsOptional()
	guarantee?: number

	@IsBoolean()
	@IsOptional()
	isArchived?: boolean

	@IsBoolean()
	@IsOptional()
	isPublished?: boolean

	@IsString()
	categoryId: string
}
