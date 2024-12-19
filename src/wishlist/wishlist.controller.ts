import {
	Controller,
	Get,
	Post,
	Delete,
	Req,
	Res,
	Body,
	Param
} from '@nestjs/common'

import type { Request, Response } from 'express'

import { User } from 'src/user/user.decorator'
import { WishlistService } from './wishlist.service'
import { CreateWishlistDto } from './dto/create-wishlist.dto'
import { OptionalAuth } from 'src/auth/optional-auth.decorator'

@Controller('wishlist')
export class WishListController {
	constructor(private readonly wishlistService: WishlistService) {}

	@Post()
	@OptionalAuth()
	create(
		@Req() req: Request,
		@Res({ passthrough: true }) res: Response,
		@User('id') userId: string,
		@Body() dto: CreateWishlistDto
	) {
		return this.wishlistService.create(req, res, userId, dto)
	}

	@Get()
	@OptionalAuth()
	getAll(@Req() req: Request, @User('id') userId: string) {
		return this.wishlistService.getAll(req, userId)
	}

	@Delete(':id')
	@OptionalAuth()
	remove(
		@Param('id') id: string,
		@Req() req: Request,
		@User('id') userId: string
	) {
		return this.wishlistService.remove(id, req, userId)
	}
}
