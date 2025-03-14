import { Injectable, PipeTransform, BadRequestException } from '@nestjs/common'

import * as fs from 'fs/promises'
import * as path from 'path'
import * as sharp from 'sharp'

const imageMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']

@Injectable()
export class SharpPipe
	implements PipeTransform<Express.Multer.File, Promise<string | string[]>>
{
	async transform(
		data: Express.Multer.File | Express.Multer.File[]
	): Promise<string | string[]> {
		if (!data || (Array.isArray(data) && data.length === 0))
			throw new BadRequestException('Недостаточно файлов для загрузки')

		if (Array.isArray(data)) {
			return Promise.all(data.map((file) => this.process(file)))
		}

		return this.process(data)
	}

	private async process(file: Express.Multer.File): Promise<string> {
		if (!imageMimes.includes(file.mimetype)) {
			throw new BadRequestException('Недопустимый формат файла')
		}

		const fileName = file.originalname
		const fileBuffer = await fs.readFile(file.path)

		await sharp(fileBuffer)
			.jpeg({ quality: 80, progressive: true, force: true })
			.toFile(path.join('static', fileName))

		return fileName
	}
}
