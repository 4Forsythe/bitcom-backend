import { forwardRef, Module } from '@nestjs/common'
import { PaymentService } from './payment.service'
import { PaymentController } from './payment.controller'
import { OrderModule } from 'src/order/order.module'
import { OrderService } from 'src/order/order.service'
import { CartModule } from 'src/cart/cart.module'
import { UserModule } from 'src/user/user.module'

@Module({
	exports: [PaymentService],
	imports: [UserModule, forwardRef(() => OrderModule), CartModule],
	controllers: [PaymentController],
	providers: [PaymentService]
})
export class PaymentModule {}
