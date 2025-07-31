import { forwardRef, Inject, Injectable } from '@nestjs/common'
import { CreatePaymentDto } from './dto/create-payment.dto'

import * as YooKassa from 'yookassa'
import { PaymentStatusDto, PaymentEventStatus } from './dto/payment-status.dto'
import { OrderService } from 'src/order/order.service'
import { OrderStatus } from 'src/order/dto/create-order.dto'
import { CartService } from 'src/cart/cart.service'
import { UserService } from 'src/user/user.service'

const yooKassa = new YooKassa({
	shopId: process.env['SHOP_ID'],
	secretKey: process.env['PAYMENT_KEY']
})

@Injectable()
export class PaymentService {
	constructor(
		private userService: UserService,
		@Inject(forwardRef(() => OrderService))
		private orderService: OrderService,
		private cartService: CartService
	) {}

	async create(dto: CreatePaymentDto) {
		return yooKassa.createPayment({
			amount: {
				value: dto.amount.value.toFixed(2),
				currency: dto.amount.currency.toUpperCase().slice(0, 3)
			},
			metadata: {
				email: dto.customer.email,
				order: dto.order
			},
			payment_method_data: {
				type: 'bank_card'
			},
			confirmation: {
				type: 'redirect',
				return_url: dto.returnUrl
			},
			description: dto.description,
			receipt: {
				customer: {
					full_name: dto.customer.name,
					email: dto.customer.email
				},
				items: dto.items
			}
		})
	}

	async getStatus(dto: PaymentStatusDto) {
		await this.confirm(dto)

		if (dto.event === PaymentEventStatus.SUCCESSED) {
			console.log('Оплата прошла')
			return this.orderService.update(dto.object.metadata.order, {
				paymentId: dto.object.id,
				status: OrderStatus.PAYED
			})
		}

		if (dto.event === PaymentEventStatus.CANCELED) {
			console.log('Оплата не прошла')
			return this.orderService.update(dto.object.metadata.order, {
				paymentId: dto.object.id,
				status: OrderStatus.CANCELED
			})
		}
	}

	private async confirm(dto: PaymentStatusDto) {
		if (dto.event !== PaymentEventStatus.WAITING) return

		const paymentId = dto.object.id
		const amount = dto.object.amount

		return yooKassa.capturePayment(paymentId, amount)
	}
}
