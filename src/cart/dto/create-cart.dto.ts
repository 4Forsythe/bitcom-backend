import { IsInt, IsOptional, IsString } from 'class-validator'

export class CreateCartDto {
	@IsString()
	productId: string

	@IsInt()
	@IsOptional()
	count?: number
}
