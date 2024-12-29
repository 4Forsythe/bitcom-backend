import { Injectable } from '@nestjs/common'

import { PrismaService } from 'src/prisma.service'
import { CreateProductCategoryDto } from './dto/create-product-category.dto'

@Injectable()
export class ProductCategoryService {
	constructor(private prisma: PrismaService) {}

	async create(dto: CreateProductCategoryDto[]) {
		const data = dto.map((item) => {
			return {
				id: item.id,
				name: item.name,
				imageUrl: item.imageUrl
			}
		})

		const categories = await this.prisma.$transaction(
			data.map((item) =>
				this.prisma.productCategory.upsert({
					where: { id: item.id },
					create: {
						...item
					},
					update: {
						...item
					}
				})
			)
		)

		return categories
	}

	async getAll() {
		const categories = await this.prisma.productCategory.findMany()

		const count = await this.prisma.productCategory.count()

		return { items: categories, count }
	}

	async getOne(id: string) {
		const category = await this.prisma.productCategory.findUnique({
			where: { id }
		})

		return category
	}
}
