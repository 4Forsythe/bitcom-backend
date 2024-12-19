import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { WishListController } from './wishlist.controller'
import { WishlistService } from './wishlist.service'
import { ProductService } from 'src/product/product.service'
import { PrismaService } from 'src/prisma.service'

@Module({
	imports: [ConfigModule],
	controllers: [WishListController],
	providers: [WishlistService, ProductService, PrismaService]
})
export class WishListModule {}
