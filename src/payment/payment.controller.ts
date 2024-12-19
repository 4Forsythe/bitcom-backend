import { Controller, Post, Body } from '@nestjs/common'
import { PaymentService } from './payment.service'
import { CreatePaymentDto } from './dto/create-payment.dto'
import { PaymentStatusDto } from './dto/payment-status.dto'

@Controller('payment')
export class PaymentController {
	constructor(private readonly paymentService: PaymentService) {}

	@Post()
	async create(@Body() dto: CreatePaymentDto) {
		return this.paymentService.create(dto)
	}

	@Post('status')
	async getStatus(@Body() dto: PaymentStatusDto) {
		return this.paymentService.getStatus(dto)
	}
}
