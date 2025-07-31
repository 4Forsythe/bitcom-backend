import { IsString, IsOptional, ValidateIf, IsNumber } from 'class-validator'

export class CreateProductCategoryDto {
	@IsString()
	id: string

	@IsString()
	name: string

	@IsString()
	@IsOptional()
	imageUrl?: string

	@IsString()
	@IsOptional()
	@ValidateIf((category) => category.parentId !== null)
	parentId?: string

	@IsNumber()
	sortOrder: number
}
