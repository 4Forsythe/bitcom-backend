import { Response } from 'express'
import { Controller, Get, Param, Res } from '@nestjs/common'
import { AppService } from './app.service'

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
}
