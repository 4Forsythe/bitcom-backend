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
import { BrandService } from './brand.service'
import { CreateBrandDto } from './dto/create-brand.dto'
import { BrandParamsDto } from './dto/brand-params.dto'

@Controller('brand')
export class BrandController {
	constructor(private readonly brandService: BrandService) {}

	@Post()
	@UseGuards(BasicAuthGuard)
	create(
		@Body(new ParseArrayPipe({ items: CreateBrandDto }))
		dto: CreateBrandDto[]
	) {
		if (dto.length === 0)
			throw new BadRequestException('Недостаточно данных для отправки')

		return this.brandService.create(dto)
	}

	@Get()
	getAll(@Query() params?: BrandParamsDto) {
		return this.brandService.getAll(params)
	}

	@Get(':id')
	getOne(@Param('id') id: string) {
		return this.brandService.getOne(id)
	}
}
