import { IsString } from 'class-validator'

export class CreateDeviceDto {
	@IsString()
	id: string

	@IsString()
	name: string
}
