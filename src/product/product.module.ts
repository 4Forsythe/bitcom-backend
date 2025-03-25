import { Module } from '@nestjs/common'

import { ProductService } from './product.service'
import { ProductController } from './product.controller'
import { ProductCategoryModule } from 'src/product-category/product-category.module'

import { PrismaService } from 'src/prisma.service'

@Module({
	exports: [ProductService],
	imports: [ProductCategoryModule],
	controllers: [ProductController],
	providers: [ProductService, PrismaService]
})
export class ProductModule {}
