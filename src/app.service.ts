import * as fs from 'fs'
import * as path from 'path'
import { Response } from 'express'
import { Injectable, NotFoundException } from '@nestjs/common'

@Injectable()
export class AppService {
	getHello(): string {
		return 'Server is running...'
	}

	getStaticFile(filename: string, res: Response) {
		const filePath = path.join('static', filename)

		if (!fs.existsSync(filePath)) {
			throw new NotFoundException('Файл не найден')
		}

		return res.sendFile(filename, { root: 'static' })
	}
}
