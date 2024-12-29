import {
	Controller,
	Get,
	Post,
	Body,
	Param,
	ParseArrayPipe,
	BadRequestException,
	UseGuards
} from '@nestjs/common'

import { ProductCategoryService } from './product-category.service'
import { BasicAuthGuard } from 'src/auth.guard'
import { CreateProductCategoryDto } from './dto/create-product-category.dto'

@Controller('product-category')
export class ProductCategoryController {
	constructor(
		private readonly productCategoryService: ProductCategoryService
	) {}

	@Post()
	@UseGuards(BasicAuthGuard)
	create(
		@Body(new ParseArrayPipe({ items: CreateProductCategoryDto }))
		dto: CreateProductCategoryDto[]
	) {
		if (dto.length === 0)
			throw new BadRequestException('Недостаточно данных для отправки')

		return this.productCategoryService.create(dto)
	}

	@Get()
	getAll() {
		return this.productCategoryService.getAll()
	}

	@Get(':id')
	getOne(@Param('id') id: string) {
		return this.productCategoryService.getOne(id)
	}
}
