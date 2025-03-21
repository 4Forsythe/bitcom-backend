import { Injectable } from '@nestjs/common'
import { type ProductCategory } from '@prisma/client'

import { PrismaService } from 'src/prisma.service'
import { CreateProductCategoryDto } from './dto/create-product-category.dto'
import { UpdateProductCategoryDto } from './dto/update-product-category.dto'

import type { ProductCategoryWithChildren } from './product-category.types'

@Injectable()
export class ProductCategoryService {
	constructor(private prisma: PrismaService) {}

	// Только для создания категорий любого уровня рекурсии
	async create(dto: CreateProductCategoryDto[]) {
		const ancestorCategories = dto.filter((item) => !item.parentId)
		const childrenCategories = dto.filter((item) => item.parentId)

		return this.prisma.$transaction(async (tx) => {
			const createdAncestorCategories = await Promise.all(
				ancestorCategories.map((dto) =>
					tx.productCategory.create({
						data: {
							id: dto.id,
							name: dto.name,
							imageUrl: dto.imageUrl
						}
					})
				)
			)
			const createdChildrenCategories = await Promise.all(
				childrenCategories.map((dto) =>
					tx.productCategory.create({
						data: {
							id: dto.id,
							name: dto.name,
							imageUrl: dto.imageUrl,
							parent: {
								connect: { id: dto.parentId }
							}
						}
					})
				)
			)

			return [...createdAncestorCategories, ...createdChildrenCategories]
		})
	}

	// Только для обновления категорий и их связей в рекурсии
	async update(dto: UpdateProductCategoryDto[]) {
		return this.prisma.$transaction(async (tx) => {
			const categories = [...dto].sort((a, b) => {
				if (!a.parentId && b.parentId) return -1
				if (a.parentId && !b.parentId) return 1

				return 0
			})

			const stack = []

			for (const category of categories) {
				const item = await tx.productCategory.update({
					where: { id: category.id },
					data: {
						name: category.name,
						imageUrl: category.imageUrl,
						...(category.parentId
							? {
									parent: { connect: { id: category.parentId } }
								}
							: {})
					}
				})

				stack.push(item)
			}

			return stack
		})
	}

	// Получение всего древа категорий
	async getAll() {
		const allCategories = await this.prisma.productCategory.findMany()

		return this.getProductCategoryTree(allCategories)
	}

	// Получение одной категории вместе с ее прямым наследником
	async getOne(id: string) {
		const category = await this.prisma.productCategory.findUnique({
			where: { id },
			include: {
				children: true
			}
		})

		return category
	}

	// Вспомогательная функция для построения дерева
	private getProductCategoryTree(categories: ProductCategory[]) {
		const map = new Map()
		const ancestorCategories = []

		categories.forEach((category) => {
			map.set(category.id, { ...category, children: [] })
		})

		categories.forEach((category) => {
			const categoryWithChildren: ProductCategoryWithChildren = map.get(
				category.id
			)

			if (category.parentId && map.has(category.parentId)) {
				map.get(category.parentId).children.push(categoryWithChildren)
			} else {
				ancestorCategories.push(categoryWithChildren)
			}
		})

		return ancestorCategories
	}
}
