import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'

@Injectable()
export class ProductCategoryService {
	constructor(private prisma: PrismaService) {}

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
