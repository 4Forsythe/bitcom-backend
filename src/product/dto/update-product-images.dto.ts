import {
	IsArray,
	IsNumber,
	IsString,
	IsOptional,
	ValidateNested
} from 'class-validator'
import { Type } from 'class-transformer'

class PreservedImageDto {
	@IsString()
	id: string

	@IsNumber()
	sortOrder: number
}

export class UpdateProductImagesDto {
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => PreservedImageDto)
	@IsOptional()
	preserved?: PreservedImageDto[]
}
