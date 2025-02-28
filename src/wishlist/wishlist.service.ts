import { Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { v4 as uuid } from 'uuid'
import { Request, Response } from 'express'

import { PrismaService } from 'src/prisma.service'
import { ProductService } from 'src/product/product.service'
import { CreateWishlistDto } from './dto/create-wishlist.dto'

@Injectable()
export class WishlistService {
	constructor(
		private productService: ProductService,
		private configService: ConfigService,
		private prisma: PrismaService
	) {}

	WISHLIST_TOKEN_NAME = 'WISHLIST_TOKEN'
	EXPIRE_DAY_WISHLIST_TOKEN = 14

	async create(
		req: Request,
		res: Response,
		userId: string,
		dto: CreateWishlistDto
	) {
		await this.productService.getOne(dto.productId)

		let token: string = req.cookies[this.WISHLIST_TOKEN_NAME]

		if (!token) token = uuid()

		if (!userId) {
			this.createWishlistToken(res, token)
		}

		let wishlist = await this.prisma.wishlist.findFirst({
			where: userId ? { OR: [{ userId }, { token }] } : { token },
			include: {
				items: { include: { product: true }, orderBy: { createdAt: 'desc' } }
			}
		})

		if (wishlist && userId) {
			await this.prisma.wishlist.update({
				where: { id: wishlist.id },
				data: { userId }
			})
		}

		if (!wishlist) {
			wishlist = await this.prisma.wishlist.create({
				data: { userId, token },
				include: {
					items: {
						include: { product: true },
						orderBy: { createdAt: 'desc' }
					}
				}
			})
		}

		let item = await this.prisma.wishlistItem.findFirst({
			where: { AND: { productId: dto.productId, wishlistId: wishlist.id } }
		})

		if (item) {
			item = await this.prisma.wishlistItem.delete({
				where: { id: item.id }
			})
		}

		if (!item) {
			item = await this.prisma.wishlistItem.create({
				data: {
					productId: dto.productId,
					wishlistId: wishlist.id
				},
				include: { product: true }
			})
		}

		return this.prisma.wishlist.findFirst({
			where: { id: wishlist.id },
			include: {
				items: {
					include: { product: { include: { category: true } } },
					orderBy: { createdAt: 'desc' }
				}
			}
		})
	}

	private createWishlistToken(res: Response, token: string) {
		const expiresIn = new Date()
		expiresIn.setDate(expiresIn.getDate() + this.EXPIRE_DAY_WISHLIST_TOKEN)

		res.cookie(this.WISHLIST_TOKEN_NAME, token, {
			domain: this.configService.get('SITE_DOMAIN'),
			expires: expiresIn,
			sameSite: 'lax'
		})
	}

	async getAll(req: Request, userId: string) {
		const token = req.cookies[this.WISHLIST_TOKEN_NAME]

		if (!userId && !token) {
			return { items: [] }
		}

		const wishlist = await this.prisma.wishlist.findFirst({
			where: userId ? { OR: [{ userId }, { token }] } : { token },
			include: {
				items: {
					include: { product: { include: { category: true } } },
					orderBy: { createdAt: 'desc' }
				}
			}
		})

		if (!wishlist) {
			return { items: [] }
		}

		return wishlist
	}

	async getOne(id: string, userId: string, token: string) {
		const wishlist = await this.prisma.wishlist.findFirst({
			where: userId ? { OR: [{ userId }, { token }] } : { token },
			include: {
				items: { include: { product: { include: { category: true } } } }
			}
		})

		if (!wishlist) throw new NotFoundException('Корзина пуста')

		const item = wishlist.items.find((item) => item.id === id)

		if (!item) throw new NotFoundException('В корзине нет такого товара')

		return item
	}

	async remove(id: string, req: Request, userId: string) {
		const token = req.cookies[this.WISHLIST_TOKEN_NAME]

		await this.getOne(id, userId, token)

		await this.prisma.wishlistItem.delete({
			where: { id }
		})

		return this.prisma.wishlist.findFirst({
			where: userId ? { OR: [{ userId }, { token }] } : { token },
			include: {
				items: {
					include: { product: { include: { category: true } } },
					orderBy: { createdAt: 'desc' }
				}
			}
		})
	}
}
