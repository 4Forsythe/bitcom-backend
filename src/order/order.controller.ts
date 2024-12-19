import {
	Controller,
	Req,
	Post,
	Body,
	Query,
	Param,
	Get,
	Patch
} from '@nestjs/common'

import { OrderService } from './order.service'
import { CreateOrderDto } from './dto/create-order.dto'
import { Auth } from 'src/auth/auth.decorator'
import { User } from 'src/user/user.decorator'
import { UpdateOrderDto } from './dto/update-order.dto'
import { Request } from 'express'
import { OrderParamsDto } from './dto/order-params.dto'

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

	@Get('me')
	@Auth()
	getAll(@User('id') userId: string, @Query() params?: OrderParamsDto) {
		return this.orderService.getAll(userId, params)
	}

	@Get('total')
	getTotal() {
		return this.orderService.getTotal()
	}

	// @Get(':id')
	// findOne(@Param('id') id: string) {
	// 	return this.orderService.findOne(+id)
	// }

	@Patch(':id')
	update(@Param('id') id: string, @Body() dto: UpdateOrderDto) {
		return this.orderService.update(id, dto)
	}

	// @Delete(':id')
	// remove(@Param('id') id: string) {
	// 	return this.orderService.remove(+id)
	// }
}
