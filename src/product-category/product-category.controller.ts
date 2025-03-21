import {
	Controller,
	Get,
	Post,
	Patch,
	Delete,
	Body,
	Param,
	ParseArrayPipe,
	BadRequestException,
	UseGuards
} from '@nestjs/common'

import { BasicAuthGuard } from 'src/auth.guard'
import { ProductCategoryService } from './product-category.service'
import { CreateProductCategoryDto } from './dto/create-product-category.dto'
import { UpdateProductCategoryDto } from './dto/update-product-category.dto'

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

	@Patch()
	@UseGuards(BasicAuthGuard)
	update(
		@Body(new ParseArrayPipe({ items: UpdateProductCategoryDto }))
		dto: CreateProductCategoryDto[]
	) {
		if (dto.length === 0)
			throw new BadRequestException('Недостаточно данных для отправки')

		return this.productCategoryService.update(dto)
	}

	@Delete(':id')
	@UseGuards(BasicAuthGuard)
	delete(@Param('id') id: string) {
		return this.productCategoryService.delete(id)
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
