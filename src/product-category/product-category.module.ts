import { Module } from '@nestjs/common'

import { ProductCategoryService } from './product-category.service'
import { ProductCategoryController } from './product-category.controller'

import { PrismaService } from 'src/prisma.service'

@Module({
	exports: [ProductCategoryService],
	controllers: [ProductCategoryController],
	providers: [ProductCategoryService, PrismaService]
})
export class ProductCategoryModule {}
