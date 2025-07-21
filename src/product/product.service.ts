import {
	Injectable,
	NotFoundException,
	BadRequestException
} from '@nestjs/common'
import * as path from 'path'
import { Prisma } from '@prisma/client'

import { SharpPipe } from 'src/sharp.pipe'
import { getLayoutVariants } from './utils/get-layout-variants'

import { PrismaService } from 'src/prisma.service'
import { ProductCategoryService } from 'src/product-category/product-category.service'
import { CreateProductDto } from './dto/create-product.dto'
import { ProductParamsDto } from './dto/product-params.dto'
import { deleteFile } from 'src/lib/delete-file'
import { UpdateProductDto } from './dto/update-product.dto'
import { UpdateProductImagesDto } from './dto/update-product-images.dto'

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
				name: dto.name,
				description: dto.description,
				count: dto.count,
				price: dto.price,
				sku: dto.sku,
				isPublished: dto.isPublished,
				categoryId: dto.categoryId
			},
			include: {
				images: {
					select: {
						id: true,
						url: true
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
				name: dto.name,
				description: dto.description,
				count: dto.count,
				price: dto.price,
				sku: dto.sku,
				isArchived: dto.isArchived,
				isPublished: dto.isPublished,
				categoryId: dto.categoryId,
				archivedAt: dto.isArchived ? new Date() : undefined
			},
			include: {
				images: {
					select: {
						id: true,
						url: true
					}
				},
				category: true
			}
		})
	}

	async uploadImages(
		productId: string,
		files: { images?: Express.Multer.File[] },
		dto: UpdateProductImagesDto
	) {
		const product = await this.prisma.product.findFirst({
			where: { id: productId }
		})

		if (!product) {
			throw new BadRequestException('Такого товара не существует')
		}

		const productImages = await this.prisma.productImage.findMany({
			where: { productId }
		})

		console.log('dto.preserved', dto.preserved)

		const preserved = productImages.filter(
			(image) => !dto.preserved.includes(image.id)
		)
		const toDelete = preserved.map((image) => image.url)

		if (toDelete.length > 0) {
			try {
				await this.prisma.productImage.deleteMany({
					where: {
						url: {
							in: toDelete
						}
					}
				})

				for (const url of toDelete) {
					console.log('toDelete list:', toDelete)
					const filePath = path.join(process.cwd(), 'static', url)
					console.log('FilePath:', filePath)
					await deleteFile(filePath)
				}
			} catch (error) {
				console.error('Cannot find image to delete:', error)
				throw new BadRequestException('Cannot find image to delete')
			}
		}

		if (files.images && files.images.length > 0) {
			const images = await new SharpPipe().transform(files.images)
			console.log('Uploaded images:', images)

			await this.prisma.productImage.createMany({
				data: images.map((url) => ({
					url,
					productId
				}))
			})
		}

		return this.prisma.product.findFirst({
			where: {
				id: productId
			},
			include: {
				images: {
					select: {
						id: true,
						url: true
					}
				},
				category: true
			}
		})
	}

	async getAll(params?: ProductParamsDto) {
		const { name, categoryId, sortBy, orderBy, take, skip } = params

		const query = getLayoutVariants(name)
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

		const products = await this.prisma.product.findMany({
			where: {
				AND: [
					whereConditions,
					...(categoryId ? [{ categoryId: { equals: categoryId } }] : [])
				]
			},
			include: {
				images: {
					select: {
						id: true,
						url: true
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
					categoryId ? { categoryId: { equals: categoryId } } : {}
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
				OR: [
					{ name: { contains: product.name } },
					product.categoryId ? { categoryId: product.categoryId } : {}
				]
			},
			include: {
				images: {
					select: {
						id: true,
						url: true
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
				OR: [
					{ name: { contains: product.name } },
					product.categoryId ? { categoryId: product.categoryId } : {}
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
					select: {
						id: true,
						url: true
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
		const product = await this.prisma.product.findUnique({
			where: { id },
			include: {
				images: {
					select: {
						id: true,
						url: true
					}
				},
				category: true
			}
		})

		if (!product) throw new NotFoundException('Товар не найден')

		if (product.category) {
			const categories = await this.prisma.productCategory.findMany()

			const category = this.productCategoryService.getProductCategoryAncestors(
				categories,
				product.category
			)

			product.category = category
		}

		return product
	}

	async getTotal() {
		return this.prisma.product.count()
	}
}
