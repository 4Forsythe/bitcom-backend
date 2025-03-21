import {
	Injectable,
	BadRequestException,
	NotFoundException
} from '@nestjs/common'
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
	async getAll() {
		const allCategories = await this.prisma.productCategory.findMany()
		const items = this.getProductCategoryTree(allCategories)

		const count = await this.prisma.productCategory.count()

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

		return this.getProductCategoryAncestors(allCategories, category)
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
	getProductCategoryTree(categories: ProductCategory[]) {
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

		return ancestorCategories
	}

	// Вспомогательная функция для построения дерева
	getProductCategoryAncestors(
		categories: ProductCategory[],
		category: ProductCategory
	) {
		if (!category.parentId) return { ...category, children: [] }

		const parent = categories.find((parent) => parent.id === category.parentId)

		if (!parent) return { ...category, children: [] }

		const ancestors: ProductCategory = this.getProductCategoryAncestors(
			categories,
			parent
		)

		return {
			...ancestors,
			children: [
				{
					...category,
					children: []
				}
			]
		}
	}
}
