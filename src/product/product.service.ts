import { Prisma } from '@prisma/client'
import { Injectable, NotFoundException } from '@nestjs/common'

import { getLayoutVariants } from './utils/get-layout-variants'

import { PrismaService } from 'src/prisma.service'
import { ProductCategoryService } from 'src/product-category/product-category.service'
import { CreateProductDto } from './dto/create-product.dto'
import { ProductParamsDto } from './dto/product-params.dto'

@Injectable()
export class ProductService {
	constructor(
		private productCategoryService: ProductCategoryService,
		private prisma: PrismaService
	) {}

	async create(dto: CreateProductDto[]) {
		const data = dto.map((item) => {
			return {
				id: item.id,
				name: item.name,
				description: item.description,
				count: item.count,
				price: item.price,
				barcode: item.barcode,
				model: item.model || item.name,
				imageUrl: item.imageUrl || undefined,
				categoryId: item.categoryId || undefined,
				deviceId: item.deviceId || undefined,
				brandId: item.brandId || undefined
			}
		})

		const itemsToDelete = data
			.filter((item) => item.count < 1)
			.map((item) => item.id)

		return this.prisma.$transaction(async (tx) => {
			await tx.product.deleteMany({
				where: {
					id: {
						in: itemsToDelete
					}
				}
			})

			const products = data
				.filter((item) => item.count >= 1)
				.map((item) => {
					return this.prisma.product.upsert({
						where: { id: item.id },
						create: item,
						update: item
					})
				})

			return Promise.all(products)
		})
	}

	async getAll(params?: ProductParamsDto) {
		const { name, categoryId, deviceId, brandId, sortBy, orderBy, take, skip } =
			params

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
					...(categoryId ? [{ categoryId: { equals: categoryId } }] : []),
					...(deviceId ? [{ deviceId }] : []),
					...(brandId ? [{ brandId }] : [])
				]
			},
			include: { category: true, brand: true, device: true },
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
					categoryId ? { categoryId: { equals: categoryId } } : {},
					...(deviceId ? [{ deviceId }] : []),
					...(brandId ? [{ brandId }] : [])
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
					product.categoryId ? { categoryId: product.categoryId } : {},
					product.deviceId ? { deviceId: product.deviceId } : {},
					product.brandId ? { brandId: product.brandId } : {}
				]
			},
			include: { category: true, brand: true, device: true },
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
					product.categoryId ? { categoryId: product.categoryId } : {},
					product.deviceId ? { deviceId: product.deviceId } : {},
					product.brandId ? { brandId: product.brandId } : {}
				]
			}
		})

		return { items, count: count > 1 ? count - 1 : count }
	}

	async getByIds(ids: string[]) {
		const products = await this.prisma.product.findMany({
			where: { id: { in: ids } },
			include: { category: true, brand: true, device: true }
		})

		const count = await this.prisma.product.count({
			where: { id: { in: ids } }
		})

		return { items: products, count }
	}

	async getOne(id: string) {
		const product = await this.prisma.product.findUnique({
			where: { id },
			include: { category: true, brand: true, device: true }
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
