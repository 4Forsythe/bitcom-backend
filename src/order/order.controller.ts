import {
	Controller,
	Req,
	Res,
	Post,
	Body,
	Query,
	Param,
	Get,
	Patch
} from '@nestjs/common'

import type { Request, Response } from 'express'

import { OrderService } from './order.service'
import { Auth } from 'src/auth/auth.decorator'
import { User } from 'src/user/user.decorator'
import { UpdateOrderDto } from './dto/update-order.dto'
import { CreateOrderDto } from './dto/create-order.dto'
import { OrderParamsDto } from './dto/order-params.dto'
import { OrderVerifyDto } from './dto/order-verify.dto'

@Controller('order')
export class OrderController {
	constructor(private readonly orderService: OrderService) {}

	@Post()
	@Auth()
	create(
		@Req() req: Request,
		@User('id') userId: string,
		@Body() dto: CreateOrderDto
	) {
		return this.orderService.create(req, userId, dto)
	}

	@Get('verify')
	async verify(@Query() params: OrderVerifyDto, @Res() res: Response) {
		const order = await this.orderService.verify(
			params.code,
			params.userId,
			params.orderId
		)

		return res.redirect(
			`${process.env.SITE_BASE_URL}/cart/thanks?order=${order.id}`
		)
	}

	@Get('me')
	@Auth()
	getAll(@User('id') userId: string, @Query() params?: OrderParamsDto) {
		return this.orderService.getAll(userId, params)
	}

	@Get(':id')
	@Auth()
	getOne(@Param('id') id: string, @User('id') userId: string) {
		return this.orderService.getOne(id, userId)
	}

	@Get('total')
	getTotal() {
		return this.orderService.getTotal()
	}

	@Patch(':id')
	@Auth()
	update(@Param('id') id: string, @Body() dto: UpdateOrderDto) {
		return this.orderService.update(id, dto)
	}
}
