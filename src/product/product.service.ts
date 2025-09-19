import * as path from 'path'
import * as NodeCache from 'node-cache'
import { Response } from 'express'
import {
	Injectable,
	NotFoundException,
	BadRequestException
} from '@nestjs/common'
import { DiscountType, Prisma } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { Workbook } from 'exceljs'

import { SharpPipe } from 'src/sharp.pipe'
import { generateSlug } from './utils/generate-slug'
import { deleteExistFile } from './utils/delete-exist-file'
import { getLayoutVariants } from './utils/get-layout-variants'

import { PrismaService } from 'src/prisma.service'
import { ProductCategoryService } from 'src/product-category/product-category.service'
import { CreateProductDto } from './dto/create-product.dto'
import { ProductParamsDto } from './dto/product-params.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import { UpdateProductImagesDto } from './dto/update-product-images.dto'
import { generateExcelWorkbook } from './utils/generate-excel-workbook'
import { ProductCategoryWithChildren } from 'src/product-category/types/product-category.types'
import {
	ProductResponse,
	ProductWithDiscountTargets
} from './types/product.types'

const CACHE_TLL_VALUE = 3600
const imageFileDir = path.join(process.env.FILE_STORAGE_URL, 'static')

@Injectable()
export class ProductService {
	constructor(
		private productCategoryService: ProductCategoryService,
		private prisma: PrismaService
	) {}

	private cache = new NodeCache({ stdTTL: CACHE_TLL_VALUE })

	private defaultProductInclude = {
		images: { orderBy: { sortOrder: 'asc' as const } },
		discountTargets: {
			where: {
				discount: { isArchived: false, expiresAt: { gte: new Date() } }
			},
			include: { discount: true },
			orderBy: { priority: 'asc' as const }
		},
		category: true
	}

	async create(dto: CreateProductDto) {
		const category = await this.prisma.productCategory.findFirst({
			where: { id: dto.categoryId }
		})

		if (!category) {
			throw new BadRequestException('Такой категории товара не существует')
		}

		return this.prisma.product.create({
			data: {
				slug: generateSlug(dto.name),
				name: dto.name,
				description: dto.description,
				count: dto.count,
				price: dto.price,
				discountPrice: dto.discountPrice,
				sku: dto.sku,
				guarantee: dto.guarantee >= 1 ? dto.guarantee : null,
				isArchived: dto.count === 0,
				isPublished: dto.isPublished,
				categoryId: dto.categoryId
			},
			include: {
				images: {
					orderBy: {
						sortOrder: 'asc'
					}
				},
				category: true
			}
		})
	}

	async update(id: string, dto: UpdateProductDto) {
		const category = await this.prisma.productCategory.findFirst({
			where: { id: dto.categoryId }
		})

		if (!category) {
			throw new BadRequestException('Такой категории товара не существует')
		}

		const product = await this.prisma.product.findFirst({
			where: { id }
		})

		if (!product) {
			throw new BadRequestException('Такого товара не существует')
		}

		return this.prisma.product.update({
			where: { id },
			data: {
				slug:
					dto.name && product.name !== dto.name
						? generateSlug(dto.name)
						: product.slug,
				name: dto.name,
				description: dto.description,
				count: dto.isArchived ? 0 : dto.count ? dto.count : null,
				price: dto.price,
				discountPrice: dto.discountPrice || null,
				sku: dto.sku || [],
				guarantee: dto.guarantee >= 1 ? dto.guarantee : null,
				isArchived: dto.count === 0 ? true : dto.isArchived,
				isPublished: dto.isPublished,
				categoryId: dto.categoryId,
				archivedAt: dto.isArchived ? new Date() : null
			},
			include: {
				images: {
					orderBy: {
						sortOrder: 'asc'
					}
				},
				category: true
			}
		})
	}

	async uploadImages(
		productId: string,
		files: { images?: Express.Multer.File[] },
		orders: number[] | null,
		dto: UpdateProductImagesDto
	) {
		const product = await this.getOne(productId)

		const productImages = await this.prisma.productImage.findMany({
			where: { productId: product.id }
		})

		const preservedIds = dto.preserved.map((item) => item.id)

		const toDelete = productImages.filter(
			(image) => !preservedIds.includes(image.id)
		)

		try {
			await this.prisma.productImage.deleteMany({
				where: {
					productId,
					id: {
						notIn: preservedIds
					}
				}
			})

			for (const { id, sortOrder } of dto.preserved) {
				await this.prisma.productImage.update({
					where: { id },
					data: { sortOrder }
				})
			}
		} catch (error) {
			console.error('Cannot find image to delete:', error)
			throw new BadRequestException('Cannot find image to delete')
		}

		await Promise.allSettled(
			toDelete.map((image) => {
				return deleteExistFile(imageFileDir, image.url)
			})
		)

		if (files.images && files.images.length > 0) {
			const images = await new SharpPipe().transform(files.images)

			await this.prisma.productImage.createMany({
				data: images.map((url, index) => ({
					url,
					productId: product.id,
					sortOrder: orders ? (orders[index] ?? 5) : 5
				}))
			})
		}

		return this.prisma.product.findFirst({
			where: {
				id: productId
			},
			include: {
				images: {
					orderBy: {
						sortOrder: 'asc'
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
		})
	}

	private getWhereLayout(input: string) {
		const query = getLayoutVariants(input)
		const terms = query.map((phrase) => phrase.split(' '))

		const whereConditions: Prisma.ProductWhereInput = {
			OR: [
				...(query.map((phrase) => ({
					OR: [{ name: { contains: phrase, mode: 'insensitive' } }]
				})) as Prisma.ProductWhereInput[]),

				...(terms.map((phrases) => ({
					OR: phrases.map((term) => ({
						OR: [{ name: { contains: term, mode: 'insensitive' } }]
					}))
				})) as Prisma.ProductWhereInput[])
			]
		}

		return whereConditions
	}

	private async getProductWithBestDiscount(
		product: ProductWithDiscountTargets
	): Promise<ProductResponse> {
		let discountPrice = product.discountPrice

		const productDiscounts = product.discountTargets.map((dt) => ({
			id: dt.discount.id,
			name: dt.discount.name,
			type: dt.discount.type,
			targetType: dt.type,
			amount: dt.discount.amount,
			priority: dt.priority,
			startedAt: dt.discount.startedAt,
			expiresAt: dt.discount.expiresAt
		}))

		const categoryTreeDiscounts =
			await this.productCategoryService.getTreeBestDiscount(product.categoryId)

		const categoryDiscounts = categoryTreeDiscounts.map((dt) => ({
			id: dt.discount.id,
			name: dt.discount.name,
			type: dt.discount.type,
			targetType: dt.type,
			amount: dt.discount.amount,
			priority: dt.priority,
			startedAt: dt.discount.startedAt,
			expiresAt: dt.discount.expiresAt
		}))

		const merged = [...productDiscounts, ...categoryDiscounts]

		if (merged.length === 0) {
			return {
				id: product.id,
				slug: product.slug,
				name: product.name,
				images: product.images,
				description: product.description,
				count: product.count,
				price: product.price,
				discountPrice: product.discountPrice,
				sku: product.sku,
				guarantee: product.guarantee,
				isArchived: product.isArchived,
				isPublished: product.isPublished,
				category: product.category,
				categoryId: product.categoryId,
				createdAt: product.createdAt,
				updatedAt: product.updatedAt,
				archivedAt: product.archivedAt
			}
		}

		merged.sort((a, b) => a.priority - b.priority)

		const discount = merged[0]

		if (discount.type === DiscountType.PERCENT) {
			discountPrice = new Decimal(product.price).minus(
				new Decimal(product.price).div(100).times(discount.amount)
			)
		} else {
			discountPrice = new Decimal(discount.amount)
		}

		return {
			id: product.id,
			slug: product.slug,
			name: product.name,
			images: product.images,
			description: product.description,
			count: product.count,
			price: product.price,
			discountPrice,
			sku: product.sku,
			guarantee: product.guarantee,
			isArchived: product.isArchived,
			isPublished: product.isPublished,
			discount: {
				id: discount.id,
				name: discount.name,
				type: discount.type,
				targetType: discount.targetType,
				amount: String(discount.amount),
				priority: discount.priority,
				startedAt: discount.startedAt.toISOString(),
				expiresAt: discount.expiresAt.toISOString()
			},
			category: product.category,
			categoryId: product.categoryId,
			createdAt: product.createdAt,
			updatedAt: product.updatedAt,
			archivedAt: product.archivedAt
		}
	}

	async getAll(params?: ProductParamsDto) {
		const {
			name,
			categoryId,
			discountId,
			onlyOriginalPrice,
			sortBy,
			orderBy,
			take,
			skip
		} = params

		const whereConditions = this.getWhereLayout(name)

		let categoryFilter: Prisma.ProductWhereInput = {}

		if (categoryId) {
			const ids =
				await this.productCategoryService.getAllNestedCategoriesForNode(
					categoryId
				)
			categoryFilter = { categoryId: { in: ids } }
		}

		const products = await this.prisma.product.findMany({
			where: {
				AND: [
					whereConditions,
					categoryFilter,
					onlyOriginalPrice
						? {
								discountPrice: null,
								discountTargets: { none: {} },
								category: { discountTargets: { none: {} } }
							}
						: {},
					discountId ? { discountTargets: { some: { discountId } } } : {},
					{ isPublished: true },
					!discountId ? { isArchived: false } : {}
				]
			},
			include: {
				images: { orderBy: { sortOrder: 'asc' as const } },
				discountTargets: {
					where: {
						discount: { isArchived: false, expiresAt: { gte: new Date() } }
					},
					include: { discount: true },
					orderBy: { priority: 'asc' as const }
				},
				category: {
					include: {
						discountTargets: {
							where: {
								discount: { isArchived: false, expiresAt: { gte: new Date() } }
							},
							include: { discount: true },
							orderBy: { priority: 'asc' as const }
						}
					}
				}
			},
			take: +take || 15,
			skip: +skip || 0,
			orderBy: [
				sortBy ? { [sortBy]: orderBy || 'desc' } : { createdAt: 'desc' },
				{ id: 'asc' }
			]
		})

		const productsWithDiscounts = await Promise.all(
			products.map((product) => this.getProductWithBestDiscount(product))
		)

		const count = await this.prisma.product.count({
			where: {
				AND: [
					whereConditions,
					categoryFilter,
					onlyOriginalPrice ? { discountPrice: null } : {},
					{ discountTargets: { some: { discountId } } },
					{ isPublished: true },
					{ isArchived: false }
				]
			}
		})

		return { items: productsWithDiscounts, count }
	}

	async getArchive(params?: ProductParamsDto) {
		const { name, categoryId, type, sortBy, orderBy, take, skip } = params

		const whereConditions = this.getWhereLayout(name)

		let categoryFilter: Prisma.ProductWhereInput = {}

		if (categoryId) {
			const ids =
				await this.productCategoryService.getAllNestedCategoriesForNode(
					categoryId
				)
			categoryFilter = { categoryId: { in: ids } }
		}

		const products = await this.prisma.product.findMany({
			where: {
				AND: [
					whereConditions,
					categoryFilter,
					type === 'archive'
						? { isArchived: true }
						: type === 'unpublished'
							? { isPublished: false }
							: { isArchived: false, isPublished: true }
				]
			},
			include: this.defaultProductInclude,
			take: +take || 15,
			skip: +skip || 0,
			orderBy: [
				sortBy ? { [sortBy]: orderBy || 'desc' } : { createdAt: 'desc' },
				{ id: 'asc' }
			]
		})

		const productsWithDiscounts = await Promise.all(
			products.map((product) => this.getProductWithBestDiscount(product))
		)

		const count = await this.prisma.product.count({
			where: {
				AND: [whereConditions, categoryFilter]
			}
		})

		return { items: productsWithDiscounts, count }
	}

	async getDiscount(params?: ProductParamsDto) {
		const { name, categoryId, sortBy, orderBy, take, skip } = params

		const whereConditions = this.getWhereLayout(name)

		let categoryFilter: Prisma.ProductWhereInput = {}

		if (categoryId) {
			const ids =
				await this.productCategoryService.getAllNestedCategoriesForNode(
					categoryId
				)
			categoryFilter = { categoryId: { in: ids } }
		}

		const products = await this.prisma.product.findMany({
			where: {
				AND: [
					whereConditions,
					categoryFilter,
					{
						OR: [
							{ discountPrice: { not: null } },
							{ discountTargets: { some: {} } },
							{ category: { discountTargets: { some: {} } } }
						]
					},
					{ isPublished: true },
					{ isArchived: false }
				]
			},
			include: {
				images: { orderBy: { sortOrder: 'asc' as const } },
				discountTargets: {
					where: {
						discount: { isArchived: false, expiresAt: { gte: new Date() } }
					},
					include: { discount: true },
					orderBy: { priority: 'asc' as const }
				},
				category: {
					include: {
						discountTargets: {
							where: {
								discount: { isArchived: false, expiresAt: { gte: new Date() } }
							},
							include: { discount: true },
							orderBy: { priority: 'asc' as const }
						}
					}
				}
			},
			take: +take || 15,
			skip: +skip || 0,
			orderBy: [
				sortBy ? { [sortBy]: orderBy || 'desc' } : { createdAt: 'desc' },
				{ id: 'asc' }
			]
		})

		const productsWithDiscounts = await Promise.all(
			products.map((product) => this.getProductWithBestDiscount(product))
		)

		const count = await this.prisma.product.count({
			where: {
				AND: [
					whereConditions,
					categoryFilter,
					{ discountPrice: { not: null } },
					{ isPublished: true },
					{ isArchived: false }
				]
			}
		})

		return { items: productsWithDiscounts, count }
	}

	async getSimilar(id: string, params?: { take: number }) {
		const { take } = params

		const product = await this.getOne(id)

		const products = await this.prisma.product.findMany({
			where: {
				AND: [
					{ isPublished: true },
					{ isArchived: false },
					{
						OR: [
							{ name: { contains: product.name } },
							product.categoryId ? { categoryId: product.categoryId } : {}
						]
					}
				]
			},
			include: this.defaultProductInclude,
			take: +take || 10,
			orderBy: {
				createdAt: 'desc'
			}
		})

		const items = await Promise.all(
			products
				.filter((item) => item.id !== product.id)
				.map((product) => this.getProductWithBestDiscount(product))
		)

		const count = await this.prisma.product.count({
			where: {
				AND: [
					{ isPublished: true },
					{ isArchived: false },
					{
						OR: [
							{ name: { contains: product.name } },
							product.categoryId ? { categoryId: product.categoryId } : {}
						]
					}
				]
			}
		})

		return { items, count: count > 1 ? count - 1 : count }
	}

	async getByIds(ids: string[]) {
		const products = await this.prisma.product.findMany({
			where: { id: { in: ids } },
			include: this.defaultProductInclude,
			orderBy: [{ createdAt: 'desc' }, { id: 'asc' }]
		})

		const productsWithDiscounts = await Promise.all(
			products.map((product) => this.getProductWithBestDiscount(product))
		)

		const count = await this.prisma.product.count({
			where: { id: { in: ids } }
		})

		return { items: productsWithDiscounts, count }
	}

	async getOne(id: string) {
		const product = await this.prisma.product.findFirst({
			where: {
				OR: [{ id }, { slug: id }]
			},
			include: this.defaultProductInclude
		})

		if (!product) throw new NotFoundException('Товар не найден')

		if (product.category) {
			const categories = await this.prisma.productCategory.findMany()

			if (!categories)
				throw new NotFoundException('Категории товара не найдены')

			const category = this.productCategoryService.getTreeToProductCategory(
				categories,
				product.category.id
			)

			product.category = category
		}

		return this.getProductWithBestDiscount(product)
	}

	async getTotal() {
		return this.prisma.product.count()
	}

	async getXLSX(res: Response) {
		let fileBuffer = this.cache.get<Buffer>('products-xlsx')

		if (!fileBuffer) {
			const workbook = new Workbook()

			const categories = await this.productCategoryService.getAll({
				flat: false
			})

			const products = await this.prisma.product.findMany({
				where: {
					isPublished: true,
					isArchived: false
				},
				include: {
					images: true,
					category: true
				}
			})

			await generateExcelWorkbook(
				workbook,
				categories.items as ProductCategoryWithChildren[],
				products
			)

			const uintArray = await workbook.xlsx.writeBuffer()
			fileBuffer = Buffer.from(uintArray)

			this.cache.set('products-xlsx', fileBuffer)
		}

		res.setHeader(
			'Content-Type',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
		)
		res.setHeader('Content-Disposition', 'attachment; filename=products.xlsx')

		res.end(fileBuffer)
	}

	async getAllForSitemap() {
		const products = await this.prisma.product.findMany({
			where: {
				isArchived: false,
				isPublished: true
			},
			take: 300
		})

		const count = await this.prisma.product.count()

		return { items: products, count }
	}
}
