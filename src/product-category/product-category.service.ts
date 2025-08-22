import {
	Injectable,
	BadRequestException,
	NotFoundException
} from '@nestjs/common'
import { type ProductCategory } from '@prisma/client'

import { PrismaService } from 'src/prisma.service'
import { CreateProductCategoryDto } from './dto/create-product-category.dto'
import { UpdateProductCategoryDto } from './dto/update-product-category.dto'
import { ProductCategoryParamsDto } from './dto/product-category-params.dto'

import type { ProductCategoryWithChildren } from './product-category.types'

@Injectable()
export class ProductCategoryService {
	constructor(private prisma: PrismaService) {}

	// Только для создания категорий любого уровня рекурсии
	async create(dto: CreateProductCategoryDto[]) {
		const ancestorCategories = dto.filter((item) => !item.parentId)
		const childrenCategories = dto.filter((item) => item.parentId)

		if (dto.some((category) => category.id === category.parentId)) {
			throw new BadRequestException(
				'Категория не должна быть вложена в саму себя'
			)
		}

		await this.getExistingIds(dto)
		await this.getMissingParents(dto)

		return this.prisma.$transaction(async (tx) => {
			const createdAncestorCategories = await Promise.all(
				ancestorCategories.map((dto) =>
					tx.productCategory.create({
						data: {
							id: dto.id,
							name: dto.name,
							imageUrl: dto.imageUrl,
							sortOrder: dto.sortOrder
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
							},
							sortOrder: dto.sortOrder
						}
					})
				)
			)

			return [...createdAncestorCategories, ...createdChildrenCategories]
		})
	}

	// Только для обновления категорий и их связей в рекурсии
	async update(dto: UpdateProductCategoryDto[]) {
		if (dto.some((category) => category.id === category.parentId)) {
			throw new BadRequestException(
				'Категория не должна быть вложена в саму себя'
			)
		}

		await this.getMissingParents(dto)

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

	async delete(id: string) {
		const category = await this.getOne(id)

		if (!category) {
			throw new NotFoundException('Категория не была найдена')
		}

		return this.prisma.productCategory.delete({
			where: { id }
		})
	}

	// Получение всего древа категорий
	async getAll(params?: ProductCategoryParamsDto) {
		const allCategories = await this.prisma.productCategory.findMany({
			orderBy: {
				sortOrder: 'asc'
			}
		})

		const count = await this.prisma.productCategory.count()

		if (params.flat) {
			const sorted = allCategories.sort((a, b) => {
				if (a.parentId && !b.parentId) return 1
				if (!a.parentId && b.parentId) return -1
			})

			return { items: sorted, count }
		}

		const items = this.getProductCategoriesTree(allCategories)

		return { items, count }
	}

	// Получение одной категории вместе с ее прямым наследником
	async getOne(id: string) {
		const allCategories = await this.prisma.productCategory.findMany()

		const category = await this.prisma.productCategory.findFirst({
			where: { id }
		})

		if (!category) {
			throw new NotFoundException('Категория не была найдена')
		}

		return this.getProductCategoryTree(allCategories, category.id)
	}

	// Вспомогательная функция для проверки dto на наличие валидных id
	private async getExistingIds(dto: CreateProductCategoryDto[]) {
		const ids = dto.map((item) => item.id)

		const existingIds = new Set(
			(
				await this.prisma.productCategory.findMany({
					where: { id: { in: ids } },
					select: { id: true }
				})
			).map((category) => category.id)
		)

		if (ids.some((id) => existingIds.has(id))) {
			throw new BadRequestException(
				'Одна или несколько категорий с таким id уже существуют'
			)
		}
	}

	// Вспомогательная функция для проверки dto на наличие валидных parentId
	private async getMissingParents(dto: UpdateProductCategoryDto[]) {
		const parentIds = dto.map((item) => item.parentId).filter(Boolean)

		const existingParents = new Set(
			(
				await this.prisma.productCategory.findMany({
					where: { id: { in: parentIds } },
					select: { id: true }
				})
			).map((category) => category.id)
		)

		if (parentIds.some((id) => !existingParents.has(id))) {
			throw new BadRequestException(
				'Одна или несколько категорий с таким parentId не существуют'
			)
		}
	}

	// Вспомогательная функция для построения дерева
	getProductCategoriesTree(categories: ProductCategory[]) {
		const map = new Map()
		const ancestorCategories: ProductCategoryWithChildren[] = []

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

		function sortTree(nodes: ProductCategoryWithChildren[]) {
			nodes.sort((a, b) => a.sortOrder - b.sortOrder)
			nodes.forEach((node) => {
				if (node.children.length > 0) {
					sortTree(node.children)
				}
			})
		}

		sortTree(ancestorCategories)

		return ancestorCategories
	}

	// Получаем полный путь от корня до конечной категории
	getProductCategoryTree(categories: ProductCategory[], categoryId: string) {
		const copy = categories.map((category) => ({ ...category, children: [] }))

		const map = new Map<string, ProductCategoryWithChildren>()
		copy.forEach((category) => {
			map.set(category.id, category)
		})

		copy.forEach((category) => {
			if (category.parentId && map.has(category.parentId)) {
				map.get(category.parentId)!.children.push(map.get(category.id)!)
			}
		})

		let current = map.get(categoryId)
		if (!current) return null

		const path: ProductCategoryWithChildren[] = []

		while (current) {
			path.unshift(current)
			current = current.parentId ? map.get(current.parentId) : null
		}

		for (const node of path) node.children = []
		for (let i = 0; i < path.length - 1; i++) {
			path[i].children = [path[i + 1]]
		}

		return path[0]
	}

	async getAllNestedCategoriesForNode(id: string) {
		const categories = await this.prisma.productCategory.findMany()

		const response: string[] = []

		function collectIds(categoryId: string) {
			response.push(categoryId)

			const children = categories.filter(
				(category) => category.parentId === categoryId
			)
			for (const child of children) {
				collectIds(child.id)
			}
		}

		collectIds(id)

		return response
	}
}
