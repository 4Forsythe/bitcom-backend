import { Module } from '@nestjs/common'

import { DiscountService } from './discount.service'
import { DiscountController } from './discount.controller'
import { UserModule } from 'src/user/user.module'
import { ProductCategoryModule } from 'src/product-category/product-category.module'
import { ProductModule } from 'src/product/product.module'

import { PrismaService } from 'src/prisma.service'

@Module({
	exports: [DiscountService],
	imports: [UserModule, ProductCategoryModule, ProductModule],
	controllers: [DiscountController],
	providers: [DiscountService, PrismaService]
})
export class DiscountModule {}
