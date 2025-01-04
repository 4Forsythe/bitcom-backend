import { Injectable, PipeTransform } from '@nestjs/common'

import * as fs from 'fs/promises'
import * as path from 'path'
import * as sharp from 'sharp'

const imageMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']

@Injectable()
export class SharpPipe
	implements PipeTransform<Express.Multer.File, Promise<string>>
{
	async transform(file: Express.Multer.File): Promise<string> {
		if (imageMimes.includes(file.mimetype)) {
			const fileName = file.originalname
			const fileBuffer = await fs.readFile(file.path)

			await sharp(fileBuffer)
				.jpeg({ quality: 80, progressive: true, force: true })
				.toFile(path.join('static', fileName))

			return fileName
		}
	}
}
