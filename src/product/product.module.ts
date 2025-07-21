import { Module } from '@nestjs/common'
import { MulterModule } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'

import { ProductService } from './product.service'
import { ProductController } from './product.controller'
import { ProductCategoryModule } from 'src/product-category/product-category.module'

import { PrismaService } from 'src/prisma.service'

@Module({
	exports: [ProductService],
	imports: [
		ProductCategoryModule,
		MulterModule.register({
			storage: memoryStorage(),
			limits: { fileSize: 50 * 1024 * 1024 }
		})
	],
	controllers: [ProductController],
	providers: [ProductService, PrismaService]
})
export class ProductModule {}
