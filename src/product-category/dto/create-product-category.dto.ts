import { IsString, IsOptional } from 'class-validator'

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
	parentId?: string
}
