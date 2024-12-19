import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { CartController } from './cart.controller'
import { CartService } from './cart.service'
import { ProductService } from 'src/product/product.service'
import { PrismaService } from 'src/prisma.service'

@Module({
	exports: [CartService],
	imports: [ConfigModule],
	controllers: [CartController],
	providers: [CartService, ProductService, PrismaService]
})
export class CartModule {}
