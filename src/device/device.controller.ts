import {
	Controller,
	Get,
	Post,
	Body,
	Query,
	Param,
	ParseArrayPipe,
	BadRequestException,
	UseGuards
} from '@nestjs/common'

import { BasicAuthGuard } from 'src/auth.guard'
import { DeviceService } from './device.service'
import { CreateDeviceDto } from './dto/create-device.dto'
import { DeviceParamsDto } from './dto/device-params.dto'

@Controller('device')
export class DeviceController {
	constructor(private readonly deviceService: DeviceService) {}

	@Post()
	@UseGuards(BasicAuthGuard)
	create(
		@Body(new ParseArrayPipe({ items: CreateDeviceDto }))
		dto: CreateDeviceDto[]
	) {
		if (dto.length === 0)
			throw new BadRequestException('Недостаточно данных для отправки')

		return this.deviceService.create(dto)
	}

	@Get()
	getAll(@Query() params?: DeviceParamsDto) {
		return this.deviceService.getAll(params)
	}

	@Get(':id')
	getOne(@Param('id') id: string) {
		return this.deviceService.getOne(id)
	}
}
