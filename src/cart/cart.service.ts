import {
	Injectable,
	NotFoundException,
	BadRequestException
} from '@nestjs/common'

import { v4 as uuid } from 'uuid'
import type { Request, Response } from 'express'
import type { CartWithDiscounts } from './cart.types'

import { CreateCartDto } from './dto/create-cart.dto'
import { UpdateCartDto } from './dto/update-cart.dto'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from 'src/prisma.service'
import { ProductService } from 'src/product/product.service'

@Injectable()
export class CartService {
	constructor(
		private productService: ProductService,
		private configService: ConfigService,
		private prisma: PrismaService
	) {}

	CART_TOKEN_NAME = 'CART_TOKEN'
	EXPIRE_DAY_CART_TOKEN = 14

	MAX_ITEMS_IN_CART = 30

	async create(
		req: Request,
		res: Response,
		userId: string,
		dto: CreateCartDto
	) {
		await this.productService.getOne(dto.productId)

		let token: string = req.cookies[this.CART_TOKEN_NAME]

		if (!token) token = uuid()

		if (!userId) {
			this.createCartToken(res, token)
		}

		let cart = await this.prisma.cart.findFirst({
			where: userId ? { OR: [{ userId }, { token }] } : { token },
			include: {
				items: {
					include: { product: true },
					orderBy: { createdAt: 'desc' }
				}
			}
		})

		if (!cart) {
			cart = await this.prisma.cart.create({
				data: {
					userId,
					token: userId ? userId : token
				},
				include: {
					items: {
						include: { product: true },
						orderBy: { createdAt: 'desc' }
					}
				}
			})
		}

		let item = await this.prisma.cartItem.findFirst({
			where: { AND: { productId: dto.productId, cartId: cart.id } }
		})

		if (item) {
			item = await this.prisma.cartItem.update({
				where: { id: item.id },
				data: { count: dto.count ? item.count + dto.count : ++item.count },
				include: { product: true }
			})
		}

		if (!item) {
			if (cart.items.length >= this.MAX_ITEMS_IN_CART) {
				throw new BadRequestException('Слишком много товаров в корзине')
			}

			item = await this.prisma.cartItem.create({
				data: {
					productId: dto.productId,
					cartId: cart.id
				},
				include: { product: true }
			})
		}

		const updated = await this.prisma.cart.findFirst({
			where: userId ? { OR: [{ userId }, { token }] } : { token },
			include: {
				items: {
					include: {
						product: {
							include: {
								discountTargets: {
									where: {
										discount: {
											isArchived: false,
											expiresAt: {
												gte: new Date()
											}
										}
									},
									include: {
										discount: true
									},
									orderBy: {
										priority: 'asc'
									}
								},
								category: {
									include: {
										discountTargets: {
											where: {
												discount: {
													isArchived: false,
													expiresAt: {
														gte: new Date()
													}
												}
											},
											include: {
												discount: true
											},
											orderBy: {
												priority: 'asc'
											}
										}
									}
								}
							}
						}
					},
					orderBy: { createdAt: 'desc' }
				}
			}
		})

		const total = this.calcCartTotal(updated)

		await this.prisma.cart.update({
			where: { id: cart.id },
			data: { user: { connect: { id: userId } }, total },
			include: {
				items: {
					include: {
						product: {
							include: {
								images: {
									select: {
										id: true,
										url: true
									}
								},
								discountTargets: {
									include: {
										discount: true
									},
									orderBy: {
										priority: 'asc'
									}
								},
								category: true
							}
						}
					},
					orderBy: { createdAt: 'desc' }
				}
			}
		})

		return this.getAll(req, userId)
	}

	private calcCartTotal(cart: CartWithDiscounts) {
		const total = cart.items.reduce((sum, item) => {
			if (item.product.isArchived) return sum

			const isDiscountAvailable =
				item.product.discountTargets.length > 0
					? new Date(item.product.discountTargets[0].discount.expiresAt) >
						new Date()
					: item.product.category.discountTargets.length > 0
						? new Date(
								item.product.category.discountTargets[0].discount.expiresAt
							) > new Date()
						: null

			const discountTarget = isDiscountAvailable
				? item.product.discountTargets.length > 0
					? {
							type: item.product.discountTargets[0].discount.type,
							amount: item.product.discountTargets[0].discount.amount
						}
					: item.product.category.discountTargets.length > 0
						? {
								type: item.product.category.discountTargets[0].discount.type,
								amount: item.product.category.discountTargets[0].discount.amount
							}
						: null
				: null

			const discountValue = discountTarget
				? Number(item.product.price) -
					(Number(item.product.price) / 100) * Number(discountTarget.amount)
				: item.product.discountPrice
					? Number(item.product.discountPrice)
					: Number(item.product.price)

			return sum + discountValue * item.count
		}, 0)

		return total
	}

	private createCartToken(res: Response, token: string) {
		const expiresIn = new Date()
		expiresIn.setDate(expiresIn.getDate() + this.EXPIRE_DAY_CART_TOKEN)

		res.cookie(this.CART_TOKEN_NAME, token, {
			domain: this.configService.get('SITE_DOMAIN'),
			expires: expiresIn,
			sameSite: 'lax'
		})
	}

	private removeCartToken(res: Response) {
		res.cookie(this.CART_TOKEN_NAME, '', {
			domain: this.configService.get('SITE_DOMAIN'),
			expires: new Date(0),
			sameSite: 'lax'
		})
	}

	async getAll(req: Request, userId: string) {
		const token = req.cookies[this.CART_TOKEN_NAME]

		if (!userId && !token) {
			return { items: [], archived: [], total: 0 }
		}

		const cart = await this.prisma.cart.findFirst({
			where: userId ? { OR: [{ userId }, { token }] } : { token },
			include: {
				items: {
					where: { product: { isPublished: true } },
					include: {
						product: {
							include: {
								images: {
									select: {
										id: true,
										url: true
									}
								},
								discountTargets: {
									where: {
										discount: {
											isArchived: false,
											expiresAt: {
												gte: new Date()
											}
										}
									},
									include: {
										discount: true
									},
									orderBy: {
										priority: 'asc'
									}
								},
								category: {
									include: {
										discountTargets: {
											where: {
												discount: {
													isArchived: false,
													expiresAt: {
														gte: new Date()
													}
												}
											},
											include: {
												discount: true
											},
											orderBy: {
												priority: 'asc'
											}
										}
									}
								}
							}
						}
					},
					orderBy: { createdAt: 'desc' }
				}
			}
		})

		if (!cart) {
			return { items: [], archived: [], total: 0 }
		}

		const hasGuestCart = !cart.userId

		if (hasGuestCart && userId) {
			await this.prisma.cart.update({
				where: {
					id: cart.id
				},
				data: {
					user: { connect: { id: userId } }
				}
			})
		}

		const availables: typeof cart.items = []
		const archived: typeof cart.items = []

		for (const item of cart.items) {
			if (item.product.isArchived) {
				archived.push(item)
			} else {
				availables.push(item)
			}
		}

		for (const item of availables) {
			if (
				!item.product.isArchived &&
				item.product.count !== null &&
				item.product.count < item.count
			) {
				item.count = item.product.count
			}
		}

		const { items, ...rest } = cart

		return {
			...rest,
			items: availables,
			archived
		}
	}

	async getOne(id: string, userId: string, token: string) {
		if (!userId && !token) {
			throw new NotFoundException('Корзина пуста')
		}

		const cart = await this.prisma.cart.findFirst({
			where: userId ? { OR: [{ userId }, { token }] } : { token },
			include: {
				items: {
					include: {
						product: {
							include: {
								images: {
									select: {
										id: true,
										url: true
									}
								},
								discountTargets: {
									include: {
										discount: true
									},
									orderBy: {
										priority: 'asc'
									}
								},
								category: true
							}
						}
					}
				}
			}
		})

		if (!cart) throw new NotFoundException('Корзина пуста')

		const item = cart.items.find((item) => item.id === id)

		if (!item) throw new NotFoundException('В корзине нет такого товара')

		return item
	}

	async update(id: string, req: Request, userId: string, dto: UpdateCartDto) {
		const token = req.cookies[this.CART_TOKEN_NAME]

		const item = await this.getOne(id, userId, token)

		if (dto.count <= 0) return this.remove(id, req, userId)

		await this.prisma.cartItem.update({
			where: { id },
			data: {
				count: dto.count ? dto.count : ++item.count,
				productId: dto.productId
			}
		})

		const cart = await this.prisma.cart.findFirst({
			where: userId ? { OR: [{ userId }, { token }] } : { token },
			include: {
				items: {
					include: {
						product: {
							include: {
								discountTargets: {
									where: {
										discount: {
											isArchived: false,
											expiresAt: {
												gte: new Date()
											}
										}
									},
									include: {
										discount: true
									},
									orderBy: {
										priority: 'asc'
									}
								},
								category: {
									include: {
										discountTargets: {
											where: {
												discount: {
													isArchived: false,
													expiresAt: {
														gte: new Date()
													}
												}
											},
											include: {
												discount: true
											},
											orderBy: {
												priority: 'asc'
											}
										}
									}
								}
							}
						}
					},
					orderBy: { createdAt: 'desc' }
				}
			}
		})

		const total = this.calcCartTotal(cart)

		await this.prisma.cart.update({
			where: { id: cart.id },
			data: { user: { connect: { id: userId } }, total },
			include: {
				items: {
					include: {
						product: {
							include: {
								images: {
									select: {
										id: true,
										url: true
									}
								},
								discountTargets: {
									include: {
										discount: true
									},
									orderBy: {
										priority: 'asc'
									}
								},
								category: true
							}
						}
					},
					orderBy: { createdAt: 'desc' }
				}
			}
		})

		return this.getAll(req, userId)
	}

	async remove(id: string, req: Request, userId: string) {
		const token = req.cookies[this.CART_TOKEN_NAME]

		await this.getOne(id, userId, token)

		await this.prisma.cartItem.delete({
			where: { id }
		})

		const cart = await this.prisma.cart.findFirst({
			where: userId ? { OR: [{ userId }, { token }] } : { token },
			include: {
				items: {
					include: {
						product: {
							include: {
								discountTargets: {
									where: {
										discount: {
											isArchived: false,
											expiresAt: {
												gte: new Date()
											}
										}
									},
									include: {
										discount: true
									},
									orderBy: {
										priority: 'asc'
									}
								},
								category: {
									include: {
										discountTargets: {
											where: {
												discount: {
													isArchived: false,
													expiresAt: {
														gte: new Date()
													}
												}
											},
											include: {
												discount: true
											},
											orderBy: {
												priority: 'asc'
											}
										}
									}
								}
							}
						}
					},
					orderBy: { createdAt: 'desc' }
				}
			}
		})

		const total = this.calcCartTotal(cart)

		await this.prisma.cart.update({
			where: { id: cart.id },
			data: { user: { connect: { id: userId } }, total },
			include: {
				items: {
					include: {
						product: {
							include: {
								images: {
									select: {
										id: true,
										url: true
									}
								},
								category: true
							}
						}
					},
					orderBy: { createdAt: 'desc' }
				}
			}
		})

		return this.getAll(req, userId)
	}

	async clear(req: Request, userId: string) {
		const token = req.cookies[this.CART_TOKEN_NAME]

		if (!userId && !token) {
			throw new NotFoundException('Корзина не найдена')
		}

		const cart = await this.prisma.cart.findFirst({
			where: userId ? { OR: [{ userId }, { token }] } : { token },
			include: {
				items: {
					include: { product: { include: { category: true } } },
					orderBy: { createdAt: 'desc' }
				}
			}
		})

		if (cart && cart.items.length > 0) {
			await this.prisma.cartItem.deleteMany({
				where: { cartId: cart.id }
			})

			return this.prisma.cart.update({
				where: { id: cart.id },
				data: {
					total: 0
				},
				include: {
					items: {
						include: { product: { include: { category: true } } },
						orderBy: { createdAt: 'desc' }
					}
				}
			})
		}

		return this.getAll(req, userId)
	}
}
