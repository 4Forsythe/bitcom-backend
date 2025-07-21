import { Controller, Get, Param } from '@nestjs/common'

import { ProductCategoryService } from './product-category.service'

@Controller('product-category')
export class ProductCategoryController {
	constructor(
		private readonly productCategoryService: ProductCategoryService
	) {}

	@Get()
	getAll() {
		return this.productCategoryService.getAll()
	}

	@Get(':id')
	getOne(@Param('id') id: string) {
		return this.productCategoryService.getOne(id)
	}
}
