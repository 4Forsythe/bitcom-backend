import {
	Controller,
	Get,
	Post,
	Patch,
	Delete,
	Req,
	Res,
	Body,
	Param
} from '@nestjs/common'

import type { Request, Response } from 'express'

import { User } from 'src/user/user.decorator'
import { OptionalAuth } from 'src/auth/optional-auth.decorator'
import { CartService } from './cart.service'
import { CreateCartDto } from './dto/create-cart.dto'
import { UpdateCartDto } from './dto/update-cart.dto'

@Controller('cart')
export class CartController {
	constructor(private readonly cartService: CartService) {}

	@Post()
	@OptionalAuth()
	create(
		@Req() req: Request,
		@Res({ passthrough: true }) res: Response,
		@User('id') userId: string,
		@Body() dto: CreateCartDto
	) {
		return this.cartService.create(req, res, userId, dto)
	}

	@Get()
	@OptionalAuth()
	getAll(@Req() req: Request, @User('id') userId: string) {
		return this.cartService.getAll(req, userId)
	}

	@Patch(':id')
	@OptionalAuth()
	update(
		@Param('id') id: string,
		@Req() req: Request,
		@User('id') userId: string,
		@Body() dto: UpdateCartDto
	) {
		return this.cartService.update(id, req, userId, dto)
	}

	@Delete(':id')
	@OptionalAuth()
	remove(
		@Param('id') id: string,
		@Req() req: Request,
		@User('id') userId: string
	) {
		return this.cartService.remove(id, req, userId)
	}

	@Delete()
	@OptionalAuth()
	clear(@Req() req: Request, @User('id') userId: string) {
		return this.cartService.clear(req, userId)
	}
}
