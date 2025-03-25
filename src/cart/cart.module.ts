import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { CartService } from './cart.service'
import { CartController } from './cart.controller'
import { ProductModule } from 'src/product/product.module'

import { PrismaService } from 'src/prisma.service'

@Module({
	exports: [CartService],
	imports: [ConfigModule, ProductModule],
	controllers: [CartController],
	providers: [CartService, PrismaService]
})
export class CartModule {}
