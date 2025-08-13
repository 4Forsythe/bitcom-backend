import { Response } from 'express'
import { Controller, Get, Post, Body, Param, Res } from '@nestjs/common'
import { AppService } from './app.service'
import { CreateServiceRequestDto } from './dto/create-service-request.dto'

@Controller()
export class AppController {
	constructor(private readonly appService: AppService) {}

	@Get()
	getHello(): string {
		return this.appService.getHello()
	}

	@Get('static/:path(*)')
	getStaticFile(@Param('path') path: string, @Res() res: Response) {
		return this.appService.getStaticFile(path, res)
	}

	@Post('send-service-request')
	sendServiceRequest(@Body() dto: CreateServiceRequestDto) {
		return this.appService.sendServiceRequest(dto)
	}
}
