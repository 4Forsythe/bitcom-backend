import { IsInt, IsNumber, IsString, IsOptional, IsArray } from 'class-validator'

export class CreateProductDto {
	@IsString()
	id: string

	@IsString()
	name: string

	@IsString()
	@IsOptional()
	description?: string

	@IsInt()
	count: number

	@IsNumber()
	price: number

	@IsArray()
	@IsString({ each: true })
	barcode: string[]

	@IsString()
	model: string

	@IsString()
	@IsOptional()
	imageUrl?: string

	@IsString()
	@IsOptional()
	categoryId?: string

	@IsString()
	@IsOptional()
	deviceId?: string

	@IsString()
	@IsOptional()
	brandId?: string
}
