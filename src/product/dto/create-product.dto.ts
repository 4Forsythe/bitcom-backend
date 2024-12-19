import { IsInt, IsNumber, IsString, IsOptional, IsUrl } from 'class-validator'

export class CreateProductDto {
	@IsString()
	@IsOptional()
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

	@IsString()
	barcode: string

	@IsString()
	model: string

	@IsUrl()
	@IsOptional()
	imageUrl: string

	@IsString()
	@IsOptional()
	categoryId: string

	@IsString()
	@IsOptional()
	deviceId: string

	@IsString()
	@IsOptional()
	brandId: string
}
