import { Injectable, PipeTransform, BadRequestException } from '@nestjs/common'

import * as fs from 'fs/promises'
import * as path from 'path'
import * as sharp from 'sharp'

const mimeTypes = ['.jpeg', '.jpg', '.png']

const fileDir = path.join(process.cwd(), 'static')

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
		if (!mimeTypes.some((mime) => file.originalname.endsWith(mime))) {
			throw new BadRequestException(
				'Недопустимый формат файла (только .JPG, .JPEG или .PNG)'
			)
		}

		await fs.mkdir(fileDir, { recursive: true })

		const fileName = file.originalname

		await sharp(file.buffer)
			.jpeg({ quality: 80, progressive: true, force: true })
			.toFile(path.join(fileDir, fileName))

		return fileName
	}
}
