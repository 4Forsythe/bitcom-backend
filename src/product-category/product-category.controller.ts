import { Controller, Get, Param, Query } from '@nestjs/common'

import { ProductCategoryService } from './product-category.service'
import { ProductCategoryParamsDto } from './dto/product-category-params.dto'

@Controller('product-category')
export class ProductCategoryController {
	constructor(
		private readonly productCategoryService: ProductCategoryService
	) {}

	@Get()
	getAll(@Query() params?: ProductCategoryParamsDto) {
		return this.productCategoryService.getAll(params)
	}

	@Get(':id')
	getOne(@Param('id') id: string) {
		return this.productCategoryService.getOne(id)
	}
}
