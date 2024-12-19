import { Controller, Get, Patch } from '@nestjs/common'

import { MetricsService } from './metrics.service'

@Controller('metrics')
export class MetricsController {
	constructor(private readonly metricsService: MetricsService) {}

	@Get()
	getAll() {
		return this.metricsService.getAll()
	}

	@Patch('viewers')
	incrementViewers() {
		return this.metricsService.incrementViewers()
	}

	@Patch('views')
	incrementViews() {
		return this.metricsService.incrementViews()
	}
}
