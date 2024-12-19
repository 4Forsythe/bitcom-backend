import { forwardRef, Module } from '@nestjs/common'
import { OrderService } from './order.service'
import { OrderController } from './order.controller'
import { PrismaService } from 'src/prisma.service'
import { UserModule } from 'src/user/user.module'
import { CartModule } from 'src/cart/cart.module'
import { PaymentModule } from 'src/payment/payment.module'

@Module({
	exports: [OrderService],
	imports: [UserModule, CartModule, forwardRef(() => PaymentModule)],
	controllers: [OrderController],
	providers: [OrderService, PrismaService]
})
export class OrderModule {}
