import * as path from 'path'
import { Response } from 'express'
import {
	Injectable,
	NotFoundException,
	BadRequestException
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
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
import { ProductCategoryWithChildren } from 'src/product-category/product-category.types'

const imageFileDir = path.join(process.env.FILE_STORAGE_URL, 'static')

@Injectable()
export class ProductService {
	constructor(
		private productCategoryService: ProductCategoryService,
		private prisma: PrismaService
	) {}

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
				category: true
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

	async getAll(params?: ProductParamsDto) {
		const { name, categoryId, onlyOriginalPrice, sortBy, orderBy, take, skip } =
			params

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
					onlyOriginalPrice ? { discountPrice: null } : {},
					{ isPublished: true },
					{ isArchived: false }
				]
			},
			include: {
				images: {
					orderBy: {
						sortOrder: 'asc'
					}
				},
				discountTargets: {
					where: {
						discount: {
							isArchived: false,
							isPublished: true,
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
				category: true
			},
			take: +take || 15,
			skip: +skip || 0,
			orderBy: [
				sortBy ? { [sortBy]: orderBy || 'desc' } : { createdAt: 'desc' },
				{ id: 'asc' }
			]
		})

		const count = await this.prisma.product.count({
			where: {
				AND: [
					whereConditions,
					categoryFilter,
					onlyOriginalPrice ? { discountPrice: null } : {},
					{ isPublished: true },
					{ isArchived: false }
				]
			}
		})

		return { items: products, count }
	}

	async getArchive(params?: ProductParamsDto) {
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
				AND: [whereConditions, categoryFilter]
			},
			include: {
				images: {
					orderBy: {
						sortOrder: 'asc'
					}
				},
				discountTargets: {
					where: {
						discount: {
							isArchived: false,
							isPublished: true,
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
				category: true
			},
			take: +take || 15,
			skip: +skip || 0,
			orderBy: [
				sortBy ? { [sortBy]: orderBy || 'desc' } : { createdAt: 'desc' },
				{ id: 'asc' }
			]
		})

		const count = await this.prisma.product.count({
			where: {
				AND: [whereConditions, categoryFilter]
			}
		})

		return { items: products, count }
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
					{ discountPrice: { not: null } },
					{ isPublished: true },
					{ isArchived: false }
				]
			},
			include: {
				images: {
					orderBy: {
						sortOrder: 'asc'
					}
				},
				discountTargets: {
					where: {
						discount: {
							isArchived: false,
							isPublished: true,
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
				category: true
			},
			take: +take || 15,
			skip: +skip || 0,
			orderBy: [
				sortBy ? { [sortBy]: orderBy || 'desc' } : { createdAt: 'desc' },
				{ id: 'asc' }
			]
		})

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

		return { items: products, count }
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
			include: {
				images: {
					orderBy: {
						sortOrder: 'asc'
					}
				},
				discountTargets: {
					where: {
						discount: {
							isArchived: false,
							isPublished: true,
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
				category: true
			},
			take: +take || 10,
			orderBy: {
				createdAt: 'desc'
			}
		})

		const items = products.filter((item) => item.id !== product.id)

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
			include: {
				images: {
					orderBy: {
						sortOrder: 'asc'
					}
				},
				discountTargets: {
					where: {
						discount: {
							isArchived: false,
							isPublished: true,
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
				category: true
			}
		})

		const count = await this.prisma.product.count({
			where: { id: { in: ids } }
		})

		return { items: products, count }
	}

	async getOne(id: string) {
		const product = await this.prisma.product.findFirst({
			where: { OR: [{ id }, { slug: id }] },
			include: {
				images: {
					orderBy: {
						sortOrder: 'asc'
					}
				},
				discountTargets: {
					where: {
						discount: {
							isArchived: false,
							isPublished: true,
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
				category: true
			}
		})

		if (!product) throw new NotFoundException('Товар не найден')

		if (product.category) {
			const categories = await this.prisma.productCategory.findMany()

			if (!categories)
				throw new NotFoundException('Категории товара не найдены')

			const category = this.productCategoryService.getProductCategoryTree(
				categories,
				product.category.id
			)

			product.category = category
		}

		return product
	}

	async getTotal() {
		return this.prisma.product.count()
	}

	async getXLSX(res: Response) {
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

		res.setHeader(
			'Content-Type',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
		)
		res.setHeader('Content-Disposition', 'attachment; filename=products.xlsx')

		await workbook.xlsx.write(res)

		res.end()
	}
}
