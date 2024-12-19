import {
	Controller,
	Get,
	Post,
	Param,
	Body,
	Query,
	ParseArrayPipe,
	BadRequestException,
	UseGuards
} from '@nestjs/common'

import { BasicAuthGuard } from 'src/auth.guard'
import { ProductService } from './product.service'
import { CreateProductDto } from './dto/create-product.dto'
import { ProductParamsDto } from './dto/product-params.dto'

@Controller('product')
export class ProductController {
	constructor(private readonly productService: ProductService) {}

	@Post()
	@UseGuards(BasicAuthGuard)
	create(
		@Body(new ParseArrayPipe({ items: CreateProductDto }))
		dto: CreateProductDto[]
	) {
		if (dto.length === 0)
			throw new BadRequestException('Недостаточно данных для отправки')

		return this.productService.create(dto)
	}

	@Get()
	getAll(@Query() params?: ProductParamsDto) {
		return this.productService.getAll(params)
	}

	@Get('similar/:id')
	getSimilar(@Param('id') id: string, @Query() params?: { take: number }) {
		return this.productService.getSimilar(id, params)
	}

	@Get('total')
	getTotal() {
		return this.productService.getTotal()
	}

	@Post()
	getByIds(@Body() dto: { ids: string[] }) {
		return this.productService.getByIds(dto.ids)
	}

	@Get(':id')
	getOne(@Param('id') id: string) {
		return this.productService.getOne(id)
	}
}
