import * as fs from 'fs'
import * as path from 'path'
import { Response } from 'express'
import { Injectable, NotFoundException } from '@nestjs/common'

const fileDir = path.join(process.env.FILE_STORAGE_URL, 'static')

@Injectable()
export class AppService {
	getHello(): string {
		return 'Server is running...'
	}

	getStaticFile(filename: string, res: Response) {
		const filePath = path.join(fileDir, filename)

		if (!fs.existsSync(filePath)) {
			throw new NotFoundException('File is not found')
		}

		return res.sendFile(filename, { root: fileDir })
	}
}
