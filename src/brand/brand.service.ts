import { Injectable } from '@nestjs/common'

import { PrismaService } from 'src/prisma.service'
import { CreateBrandDto } from './dto/create-brand.dto'
import { BrandParamsDto } from './dto/brand-params.dto'

@Injectable()
export class BrandService {
	constructor(private prisma: PrismaService) {}

	async create(dto: CreateBrandDto[]) {
		const data = dto.map((item) => {
			return {
				id: item.id,
				name: item.name
			}
		})

		const brands = await this.prisma.$transaction(
			data.map((item) =>
				this.prisma.brand.upsert({
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

		return brands
	}

	async getAll(params?: BrandParamsDto) {
		const { take, skip } = params

		const brands = await this.prisma.brand.findMany({
			take: +take || undefined,
			skip: +skip || 0,
			orderBy: {
				name: 'asc'
			}
		})

		const count = await this.prisma.brand.count()

		return { items: brands, count }
	}

	async getOne(id: string) {
		const brand = await this.prisma.brand.findUnique({
			where: { id }
		})

		return brand
	}
}
