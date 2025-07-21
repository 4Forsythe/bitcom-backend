import { IsArray, IsString, IsOptional } from 'class-validator'

export class UpdateProductImagesDto {
	@IsArray()
	@IsString({ each: true })
	@IsOptional()
	preserved?: string[]
}
