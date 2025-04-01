import {
	Inject,
	Injectable,
	forwardRef,
	NotFoundException,
	BadRequestException
} from '@nestjs/common'
import type { CartItem, Product, User } from '@prisma/client'

import { Request } from 'express'

import { sendMail } from 'src/lib/send-mail'
import { generateHash } from 'src/lib/generate-hash'

import {
	CreateOrderDto,
	OrderPaymentMethod,
	OrderStatus
} from './dto/create-order.dto'
import { PrismaService } from 'src/prisma.service'
import { UserService } from 'src/user/user.service'
import { CartService } from 'src/cart/cart.service'
import { PaymentService } from 'src/payment/payment.service'
import { UpdateOrderDto } from './dto/update-order.dto'
import { OrderParamsDto } from './dto/order-params.dto'
import { sendTelegramMessage } from 'src/lib/send-telegram-message'

type CartItemWithProducts = CartItem & {
	product: Product
}

@Injectable()
export class OrderService {
	constructor(
		private userService: UserService,
		private cartService: CartService,
		@Inject(forwardRef(() => PaymentService))
		private paymentService: PaymentService,
		private prisma: PrismaService
	) {}

	SITE_BASE_URL = process.env.SITE_BASE_URL
	RECIPIENT_EMAIL = process.env.RECIPIENT_EMAIL
	BOT_CHAT_ID = process.env.BOT_REPLY_CHAT_ID

	async create(req: Request, userId: string | null, dto: CreateOrderDto) {
		let user: Omit<User, 'password'> | null = null

		if (userId) {
			user = await this.userService.getOne(userId)
		}

		const token: string | undefined =
			req.cookies[this.cartService.CART_TOKEN_NAME]

		if (!userId && !token) {
			throw new NotFoundException('Ваша корзина не найдена')
		}

		const cart = await this.cartService.getAll(req, userId)

		if (!cart) {
			throw new NotFoundException('Ваша корзина не найдена')
		}

		if (cart.items.length === 0) {
			throw new BadRequestException('В вашей корзине недостаточно товаров')
		}

		const hasOrders = await this.prisma.order.count({
			where: {
				AND: [
					userId ? { OR: [{ userId }, { token }] } : { token },
					{ status: OrderStatus.CREATED }
				]
			}
		})

		if (hasOrders >= 10) {
			throw new BadRequestException('TOO_MANY_ORDERS')
		}

		const carts = cart.items.map((item: CartItemWithProducts) => ({
			count: item.count,
			price: Number(item.product.price),
			productId: item.productId
		}))

		const total = carts.reduce((sum, item) => sum + item.price * item.count, 0)

		const {
			customerName,
			customerEmail,
			customerPhone,
			address,
			comment,
			paymentId,
			gettingMethod,
			paymentMethod
		} = dto

		const customerFullName =
			[customerName.lastName, customerName.firstName, customerName.middleName]
				.filter(Boolean)
				.join(' ') || undefined

		const order = await this.prisma.order.create({
			data: {
				total,
				customerName: customerFullName,
				customerEmail,
				customerPhone,
				address,
				comment,
				token: userId || token,
				paymentId,
				status: OrderStatus.PENDING,
				gettingMethod,
				paymentMethod,
				userId
			},
			include: {
				items: { include: { product: true } }
			}
		})

		await this.prisma.orderItem.createMany({
			data: carts.map((item) => ({
				count: item.count,
				productId: item.productId,
				orderId: order.id
			}))
		})

		await this.cartService.clear(req, userId)

		if (
			user &&
			(customerFullName !== user.name || customerPhone !== user.phone)
		) {
			await this.userService.update(userId, {
				name: customerFullName || undefined,
				phone: customerPhone
			})
		}

		if (dto.paymentMethod === OrderPaymentMethod.CASH) {
			// if (!user.isActive) {
			// 	await this.update(order.id, {
			// 		status: OrderStatus.WAITING
			// 	})

			// 	return this.sendCode(user.email, order.id)
			// }

			await this.update(order.id, {
				status: OrderStatus.CREATED
			})
		}

		if (dto.paymentMethod === OrderPaymentMethod.CARD) {
			const paymentItems = cart.items.map((item) => ({
				amount: { value: Number(item.product.price), currency: 'RUB' },
				description: item.product.name,
				quantity: item.count,
				vat_code: 4
			}))

			await this.paymentService.create({
				amount: { value: total, currency: 'RUB' },
				description: `Оплата заказа №-${order.id}`,
				customer: {
					name: customerFullName,
					email: customerEmail,
					phone: customerPhone
				},
				items: paymentItems,
				order: order.id,
				returnUrl: `${this.SITE_BASE_URL}/my/order-list`
			})
		}

		const response = await this.prisma.order.findUnique({
			where: { id: order.id },
			include: {
				items: { include: { product: { include: { category: true } } } }
			}
		})

		const orderHash = new Date(response.createdAt)
			.getTime()
			.toString()
			.slice(-8)

		const items = response.items.map((item) => ({
			count: item.count,
			name: item.product.name,
			barcode: item.product.barcode.join(', ')
		}))

		if (response.status === OrderStatus.CREATED) {
			await sendMail({
				to: this.RECIPIENT_EMAIL,
				subject: 'Новый заказ',
				html: {
					path: 'src/templates/create-order.template.html',
					replacements: {
						orderId: orderHash,
						customerName: customerFullName,
						customerEmail,
						customerPhone,
						gettingMethod,
						paymentMethod,
						items: items
					}
				}
			})

			const html = `
				📝 <b>Новый заказ на сайте</b>

				№-<b>${orderHash}</b>
				Дата оформления: <b>${response.createdAt.toLocaleString()}</b>
				cuid (для разработчика): <code>${response.id}</code>

				🙋‍♂️ <u>Контактные данные</u>:

				${customerFullName}
				${customerEmail}
				${customerPhone}

				🚚 <b>${gettingMethod}</b>
				💳 <b>${paymentMethod}</b>

				🛍️ <u>Список товаров</u>:

				${items.map((item) => `> (<code>${item.barcode}</code>) ${item.name} — ${item.count} шт.`).join('\n')}

				<blockquote>Это сообщение было продублировано с контактной почты <b>${this.RECIPIENT_EMAIL}</b></blockquote>
			`
				.split('\n')
				.map((line) => line.trim())
				.join('\n')

			await sendTelegramMessage(this.BOT_CHAT_ID, html)

			if (user && user.isSubscribed) {
				await sendMail({
					to: user.email,
					subject: 'Ваш заказ создан',
					html: {
						path: 'src/templates/order-notification.template.html',
						replacements: {
							orderId: orderHash,
							total,
							customerName: customerFullName,
							customerPhone,
							gettingMethod,
							paymentMethod,
							items: items,
							createdAt: response.createdAt.toLocaleDateString()
						}
					}
				})
			}
		}

		return response
	}

	async sendCode(email: string, orderId: string) {
		const user = await this.prisma.user.findUnique({
			where: { email }
		})

		if (!user) throw new BadRequestException('Пользователь не найден')

		const order = await this.prisma.order.findUnique({
			where: { id: orderId },
			include: {
				items: { include: { product: true } }
			}
		})

		if (!order) throw new NotFoundException('Заказ не найден')

		if (order.status === OrderStatus.CREATED)
			throw new NotFoundException('Заказ уже подтвержден')

		const code = await this.userService.generateCode(user.id)

		await sendMail({
			to: email,
			subject: 'Подтвердите ваш заказ',
			html: {
				path: 'src/templates/confirm-order.template.html',
				replacements: {
					total: order.total,
					items: order.items.map((item) => {
						return {
							count: item.count,
							name: item.product.name
						}
					}),
					createdAt: order.createdAt,
					returnUrl: `${process.env.BASE_URL}/order/verify?code=${code}&userId=${user.id}&orderId=${orderId}`
				}
			}
		})
	}

	async verify(code: string, userId: string, orderId: string) {
		const user = await this.prisma.user.findUnique({
			where: { id: userId }
		})

		const userCode = await this.prisma.userCode.findUnique({
			where: { userId }
		})

		if (!user) throw new BadRequestException('Пользователь не найден')
		if (!userCode) throw new BadRequestException('Код подтверждения не найден')

		const isValidCode = await this.prisma.userCode.findUnique({
			where: {
				code,
				userId: user.id,
				expiresAt: {
					gt: new Date()
				}
			}
		})

		if (!isValidCode)
			throw new BadRequestException('Введен неверный код подтверждения')

		await this.prisma.userCode.delete({
			where: { id: userCode.id }
		})

		if (!user.isActive) {
			await this.prisma.user.update({
				where: { id: user.id },
				data: {
					isActive: true
				}
			})
		}

		const order = await this.prisma.order.findUnique({
			where: { id: orderId },
			include: {
				items: { include: { product: true } }
			}
		})

		if (!order) {
			throw new BadRequestException('Заказ потерялся или утратил актуальность.')
		}

		await this.update(orderId, {
			status: OrderStatus.CREATED
		})

		const { customerName, customerEmail, customerPhone } = order

		await sendMail({
			to: this.RECIPIENT_EMAIL,
			subject: 'Новый заказ',
			html: {
				path: 'src/templates/create-order.template.html',
				replacements: {
					customerName,
					customerEmail,
					customerPhone,
					items: order.items.map((item) => {
						return {
							count: item.count,
							name: item.product.name,
							barcode: item.product.barcode.join(', ')
						}
					})
				}
			}
		})

		return order
	}

	async getAll(req: Request, userId: string, params?: OrderParamsDto) {
		const { take, skip } = params
		const token = req.cookies[this.cartService.CART_TOKEN_NAME]

		const orders = await this.prisma.order.findMany({
			where: { OR: [{ userId }, { token }] },
			orderBy: { createdAt: 'desc' },
			include: {
				items: { include: { product: { include: { category: true } } } }
			},
			take: +take || 10,
			skip: +skip || 0
		})

		if (!orders) {
			return { items: [], count: 0 }
		}

		const guestOrders = orders.filter((order) => !order.userId)

		if (guestOrders.length > 0 && userId) {
			await this.prisma.order.updateMany({
				where: {
					token,
					userId: null
				},
				data: {
					userId
				}
			})
		}

		const count = await this.prisma.order.count({
			where: { userId }
		})

		return { items: orders, count }
	}

	async getOne(id: string, req: Request, userId: string) {
		const token = req.cookies['CART_TOKEN']

		if (!userId && !token) {
			throw new NotFoundException('Заказ не найден')
		}

		const order = await this.prisma.order.findFirst({
			where: {
				AND: [{ id }, userId ? { OR: [{ userId }, { token }] } : { token }]
			},
			include: {
				items: { include: { product: { include: { category: true } } } }
			}
		})

		if (!order) {
			throw new NotFoundException('Заказ не найден')
		}

		return order
	}

	async update(id: string, dto: UpdateOrderDto) {
		const order = await this.prisma.order.findUnique({
			where: { id }
		})

		if (!order) {
			throw new NotFoundException('Заказ не найден')
		}

		const {
			customerName,
			customerEmail,
			customerPhone,
			address,
			comment,
			paymentId,
			status,
			gettingMethod,
			paymentMethod
		} = dto

		const customerFullName =
			[
				customerName?.lastName,
				customerName?.firstName,
				customerName?.middleName
			]
				.filter(Boolean)
				.join(' ') || undefined

		return this.prisma.order.update({
			where: { id },
			data: {
				customerName: customerFullName,
				customerEmail,
				customerPhone,
				address,
				comment,
				paymentId,
				status,
				gettingMethod,
				paymentMethod
			},
			include: {
				items: { include: { product: { include: { category: true } } } }
			}
		})
	}

	async getTotal() {
		return this.prisma.order.count()
	}

	async remove(id: string) {
		const order = await this.prisma.order.findUnique({
			where: { id }
		})

		if (!order) {
			throw new NotFoundException('Заказ не найден')
		}

		return this.prisma.order.delete({
			where: { id }
		})
	}
}
