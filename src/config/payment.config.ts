import { ConfigService } from '@nestjs/config'

export const getPaymentConfig = async (configService: ConfigService) => ({
	shopId: configService.get('SHOP_ID'),
	secretKey: configService.get('PAYMENT_KEY')
})
