import {
	BadRequestException,
	forwardRef,
	Inject,
	Injectable,
	NotFoundException
} from '@nestjs/common'

import { Request } from 'express'

import { sendMail } from 'src/lib/send-mail'

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

	async create(req: Request, userId: string, dto: CreateOrderDto) {
		const user = await this.userService.getOne(userId)
		const cart = await this.cartService.getAll(req, userId)

		if (cart.items.length === 0) {
			throw new BadRequestException('В вашей корзине недостаточно товаров')
		}

		const hasOrders = await this.prisma.order.count({
			where: {
				AND: [{ userId }, { status: OrderStatus.CREATED }]
			}
		})

		if (hasOrders >= 10) {
			throw new BadRequestException('TOO_MANY_ORDERS')
		}

		const carts = cart.items.map((item) => ({
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

		const order = await this.prisma.order.create({
			data: {
				total,
				customerName,
				customerEmail,
				customerPhone,
				address,
				comment,
				token: userId,
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

		if (customerPhone !== user.phone) {
			await this.userService.update(userId, { phone: customerPhone })
		}

		if (dto.paymentMethod === OrderPaymentMethod.CASH) {
			if (!user.isActive) {
				await this.update(order.id, {
					status: OrderStatus.WAITING
				})

				return this.sendCode(user.email, order.id)
			}

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
					name: customerName,
					email: customerEmail,
					phone: customerPhone
				},
				items: paymentItems,
				order: order.id,
				returnUrl: `${this.SITE_BASE_URL}/my/order-list`
			})
		}

		const response = await this.prisma.order.findUnique({
			where: { id: order.id }
		})

		if (response.status === OrderStatus.CREATED) {
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

	async getAll(userId: string, params?: OrderParamsDto) {
		const { take, skip } = params

		const orders = await this.prisma.order.findMany({
			where: { userId },
			orderBy: { createdAt: 'desc' },
			include: { items: { include: { product: true } } },
			take: +take || 10,
			skip: +skip || 0
		})

		const count = await this.prisma.order.count({
			where: { userId }
		})

		if (!orders) {
			return { items: [], count: 0 }
		}

		return { items: orders, count }
	}

	async getOne(id: string, userId: string) {
		const order = await this.prisma.order.findUnique({
			where: { id, userId },
			include: { items: { include: { product: true } } }
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

		return this.prisma.order.update({
			where: { id },
			data: {
				customerName: dto?.customerName,
				customerEmail: dto?.customerEmail,
				customerPhone: dto?.customerPhone,
				address: dto?.address,
				comment: dto?.comment,
				paymentId: dto?.paymentId,
				status: dto?.status,
				gettingMethod: dto?.gettingMethod,
				paymentMethod: dto?.paymentMethod
			},
			include: {
				items: { include: { product: true } }
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
