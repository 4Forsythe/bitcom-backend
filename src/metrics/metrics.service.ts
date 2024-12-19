import { Injectable } from '@nestjs/common'

import { PrismaService } from 'src/prisma.service'

@Injectable()
export class MetricsService {
	constructor(private prisma: PrismaService) {}

	async getAll() {
		const metrics = await this.prisma.metrics.findFirst()

		if (!metrics) {
			return this.prisma.metrics.create({ data: {} })
		}

		return metrics
	}

	async incrementViewers() {
		const metrics = await this.getAll()

		return this.prisma.metrics.update({
			where: { id: metrics.id },
			data: {
				viewers: { increment: 1 }
			}
		})
	}

	async incrementViews() {
		const metrics = await this.getAll()

		return this.prisma.metrics.update({
			where: { id: metrics.id },
			data: {
				views: { increment: 1 }
			}
		})
	}
}
