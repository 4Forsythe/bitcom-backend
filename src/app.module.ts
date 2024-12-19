import { Module } from '@nestjs/common'
import { AuthModule } from './auth/auth.module'
import { UserModule } from './user/user.module'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { CartModule } from './cart/cart.module'
import { ProductModule } from './product/product.module'
import { ProductCategoryModule } from './product-category/product-category.module'
import { DeviceModule } from './device/device.module'
import { WishListModule } from './wishlist/wishlist.module'
import { OrderModule } from './order/order.module'
import { PaymentModule } from './payment/payment.module'
import { ConfigModule } from '@nestjs/config'
import { MetricsModule } from './metrics/metrics.module'
import { UploadModule } from './upload/upload.module'
import { BrandModule } from './brand/brand.module'

@Module({
	imports: [
		ConfigModule.forRoot(),
		AuthModule,
		UserModule,
		ProductModule,
		CartModule,
		ProductCategoryModule,
		DeviceModule,
		BrandModule,
		WishListModule,
		OrderModule,
		PaymentModule,
		MetricsModule,
		UploadModule
	],
	controllers: [AppController],
	providers: [AppService]
})
export class AppModule {}
