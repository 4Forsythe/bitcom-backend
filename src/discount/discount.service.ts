import {
	BadRequestException,
	Injectable,
	NotFoundException
} from '@nestjs/common'

import { ProductCategoryService } from 'src/product-category/product-category.service'
import { ProductService } from 'src/product/product.service'
import { PrismaService } from 'src/prisma.service'
import { CreateDiscountDto } from './dto/create-discount.dto'
import { UpdateDiscountDto } from './dto/update-discount.dto'

import { DiscountType, DiscountTargetType } from '@prisma/client'
import { DiscountParamsDto } from './dto/discount-params.dto'

@Injectable()
export class DiscountService {
	constructor(
		private productCategoryService: ProductCategoryService,
		private productService: ProductService,
		private prisma: PrismaService
	) {}

	async create(dto: CreateDiscountDto) {
		const startedAt = new Date(dto.startedAt)
		const expiresAt = new Date(dto.expiresAt)

		if (expiresAt <= startedAt) {
			throw new BadRequestException(
				'Дата завершения акции должна быть позже даты начала'
			)
		}

		if (!dto.categoryId && dto.products.length === 0) {
			throw new BadRequestException('Не выбрана цель акции')
		}

		const discount = await this.prisma.discount.create({
			data: {
				name: dto.name,
				type: dto.type as DiscountType,
				amount: dto.amount,
				startedAt,
				expiresAt
			}
		})

		if (dto.categoryId) {
			await this.prisma.discountTarget.create({
				data: {
					type: DiscountTargetType.CATEGORY,
					priority:
						dto.priority && dto.priority > 0 ? dto.priority - 1 : dto.priority,
					categoryId: dto.categoryId,
					discountId: discount.id
				}
			})

			return this.getOne(discount.id)
		}

		if (dto.products.length > 0) {
			for (const productId of dto.products) {
				await this.prisma.discountTarget.create({
					data: {
						type: DiscountTargetType.PRODUCT,
						priority: dto.priority,
						productId,
						discountId: discount.id
					}
				})
			}
		}

		return this.getOne(discount.id)
	}

	async getAll(params?: DiscountParamsDto) {
		const { sortBy, orderBy, take, skip } = params

		const discounts = await this.prisma.discount.findMany({
			include: {
				targets: {
					include: {
						product: true,
						category: true
					}
				}
			},
			take: +take || 15,
			skip: +skip || 0,
			orderBy: [
				sortBy ? { [sortBy]: orderBy || 'desc' } : { amount: 'desc' },
				{ id: 'asc' }
			]
		})

		if (!discounts) {
			return { items: [], count: 0 }
		}

		// DiscountType sort
		// const sorted = discounts.sort((a, b) => {
		// 	if (a.type === 'PERCENT' && b.type !== 'FIXED') return -1
		// 	if (a.type !== 'PERCENT' && b.type === 'FIXED') return 1
		// 	return Number(a.amount) - Number(b.amount)
		// })

		const count = await this.prisma.discount.count({})

		return { items: discounts, count }
	}

	async getActual(params?: DiscountParamsDto) {
		const { sortBy, orderBy, take, skip } = params

		const now = new Date()

		const discounts = await this.prisma.discount.findMany({
			where: {
				isArchived: false,
				expiresAt: {
					gt: now
				}
			},
			include: {
				targets: {
					include: {
						product: true,
						category: true
					}
				}
			},
			take: +take || 15,
			skip: +skip || 0,
			orderBy: [
				sortBy ? { [sortBy]: orderBy || 'desc' } : { amount: 'desc' },
				{ id: 'asc' }
			]
		})

		if (!discounts) {
			return { items: [], count: 0 }
		}

		// DiscountType sort
		// const sorted = discounts.sort((a, b) => {
		// 	if (a.type === 'PERCENT' && b.type !== 'FIXED') return -1
		// 	if (a.type !== 'PERCENT' && b.type === 'FIXED') return 1
		// 	return Number(a.amount) - Number(b.amount)
		// })

		const count = await this.prisma.discount.count({
			where: {
				isArchived: false,
				expiresAt: {
					gt: now
				}
			}
		})

		return { items: discounts, count }
	}

	async getOne(id: string) {
		const discount = await this.prisma.discount.findFirst({
			where: { id },
			include: {
				targets: {
					include: {
						product: true,
						category: true
					}
				}
			}
		})

		if (!discount) {
			throw new NotFoundException('Акция не найдена')
		}

		return discount
	}

	async update(id: string, dto: UpdateDiscountDto) {
		const discount = await this.prisma.discount.findFirst({
			where: { id }
		})

		if (!discount) {
			throw new NotFoundException('Акция не найдена')
		}

		const startedAt = new Date(dto.startedAt)
		const expiresAt = new Date(dto.expiresAt)

		if (expiresAt <= startedAt) {
			throw new BadRequestException(
				'Дата завершения акции должна быть позже даты начала'
			)
		}

		await this.prisma.discount.update({
			where: { id },
			data: {
				name: dto.name,
				type: dto.type as DiscountType,
				amount: dto.amount,
				isArchived: dto.isArchived,
				startedAt,
				expiresAt
			}
		})

		const targets = await this.prisma.discountTarget.findMany({
			where: { discountId: discount.id }
		})

		const categoryTarget = targets.find((target) => target.categoryId)

		if (categoryTarget && !dto.categoryId) {
			try {
				await this.prisma.discountTarget.deleteMany({
					where: {
						categoryId: categoryTarget.categoryId,
						discountId: discount.id
					}
				})
			} catch (error) {
				console.error(
					'[PATCH] discount: Cannot delete category from targets',
					error
				)
			}
		} else if (
			(!categoryTarget && dto.categoryId) ||
			(dto.categoryId && categoryTarget.categoryId !== dto.categoryId)
		) {
			await this.prisma.discountTarget.upsert({
				where: { id: categoryTarget.id },
				create: {
					type: DiscountTargetType.CATEGORY,
					priority:
						dto.priority && dto.priority > 0 ? dto.priority - 1 : dto.priority,
					categoryId: dto.categoryId,
					discountId: discount.id
				},
				update: {
					categoryId: dto.categoryId
				}
			})

			try {
				await this.prisma.discountTarget.deleteMany({
					where: {
						type: DiscountTargetType.PRODUCT,
						discountId: discount.id
					}
				})
			} catch (error) {
				console.error(
					'[PATCH] discount: Cannot delete products from targets',
					error
				)
			}

			return this.getOne(discount.id)
		}

		const productTargets = targets
			.filter((target) => target.type === 'PRODUCT')
			.map((target) => target.productId)

		const products = dto.products

		const toDelete = productTargets.filter((id) => !products.includes(id))
		try {
			await this.prisma.discountTarget.deleteMany({
				where: {
					productId: { in: toDelete },
					discountId: discount.id
				}
			})
		} catch (error) {
			console.error(
				'[PATCH] discount: Cannot delete products from targets',
				error
			)
		}

		const toCreate = products.filter((id) => !productTargets.includes(id))
		try {
			for (const productId of toCreate) {
				await this.prisma.discountTarget.create({
					data: {
						type: DiscountTargetType.PRODUCT,
						priority: dto.priority,
						productId,
						discountId: discount.id
					}
				})
			}
		} catch (error) {
			console.error(
				'[PATCH] discount: Cannot create product from targets',
				error
			)
		}

		const toUpdate = productTargets.filter((id) => products.includes(id))
		try {
			await this.prisma.discountTarget.updateMany({
				where: {
					productId: { in: toUpdate },
					discountId: discount.id
				},
				data: {
					priority: dto.priority
				}
			})
		} catch (error) {
			console.error(
				'[PATCH] discount: Cannot update products from targets',
				error
			)
		}

		return this.getOne(discount.id)
	}

	async remove(id: string) {
		const discount = await this.getOne(id)

		const data = await this.prisma.discount.update({
			where: { id: discount.id },
			data: {
				isArchived: true
			},
			include: {
				targets: {
					include: {
						product: true,
						category: true
					}
				}
			}
		})

		return data
	}
}
