import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { WishlistService } from './wishlist.service'
import { WishListController } from './wishlist.controller'
import { ProductModule } from 'src/product/product.module'

import { PrismaService } from 'src/prisma.service'

@Module({
	imports: [ConfigModule, ProductModule],
	controllers: [WishListController],
	providers: [WishlistService, PrismaService]
})
export class WishListModule {}
