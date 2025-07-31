import { Module } from '@nestjs/common'
import { AuthModule } from './auth/auth.module'
import { UserModule } from './user/user.module'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { CartModule } from './cart/cart.module'
import { ProductModule } from './product/product.module'
import { ProductCategoryModule } from './product-category/product-category.module'
import { WishListModule } from './wishlist/wishlist.module'
import { OrderModule } from './order/order.module'
import { PaymentModule } from './payment/payment.module'
import { ConfigModule } from '@nestjs/config'
import { envValidationSchema } from './config/env.validation'

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			validationSchema: envValidationSchema
		}),
		AuthModule,
		UserModule,
		ProductModule,
		CartModule,
		ProductCategoryModule,
		WishListModule,
		OrderModule,
		PaymentModule
	],
	controllers: [AppController],
	providers: [AppService]
})
export class AppModule {}
