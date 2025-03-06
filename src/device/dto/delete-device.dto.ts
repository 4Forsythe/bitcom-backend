import { IsString } from 'class-validator'

export class DeleteDeviceDto {
	@IsString()
	id: string
}
