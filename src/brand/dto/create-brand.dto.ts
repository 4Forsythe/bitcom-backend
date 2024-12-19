import { IsString } from 'class-validator'

export class CreateBrandDto {
	@IsString()
	id: string

	@IsString()
	name: string
}
