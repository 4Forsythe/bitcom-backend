import { Injectable, PipeTransform, BadRequestException } from '@nestjs/common'
import { v4 as uuid } from 'uuid'

import * as fs from 'fs/promises'
import * as path from 'path'
import * as sharp from 'sharp'

type Ratio = '4:3' | '3:4' | '1:1' | 'auto'

const mimeTypes = ['.jpeg', '.jpg', '.png', '.webp']

const fileDir = path.join(process.env.FILE_STORAGE_URL, 'static', 'products')

const watermarkPath = path.join(
	process.cwd(),
	'public',
	'static',
	'watermark.png'
)

const ASPECT_PRESETS: Record<
	Exclude<Ratio, 'auto'>,
	{ width: number; height: number }
> = {
	'4:3': { width: 1440, height: 1080 },
	'3:4': { width: 1080, height: 1440 },
	'1:1': { width: 1000, height: 1000 }
}

@Injectable()
export class SharpPipe
	implements PipeTransform<Express.Multer.File, Promise<string[]>>
{
	private watermarkBuffer: Buffer | null = null

	async transform(
		data: Express.Multer.File | Express.Multer.File[]
	): Promise<string[]> {
		if (!data || (Array.isArray(data) && data.length === 0))
			throw new BadRequestException('Недостаточно файлов для загрузки')

		if (Array.isArray(data)) {
			return Promise.all(data.map((file) => this.process(file)))
		}

		return [await this.process(data)]
	}

	private async loadWatermark(): Promise<Buffer | null> {
		if (this.watermarkBuffer) return this.watermarkBuffer

		try {
			const buffer = await fs.readFile(watermarkPath)

			this.watermarkBuffer = await sharp(buffer)
				.resize({ width: 150, withoutEnlargement: true })
				.png()
				.toBuffer()

			return this.watermarkBuffer
		} catch (error) {
			console.error('SharpPipe: Не найден файл watermark.png')
			return null
		}
	}

	private async process(
		file: Express.Multer.File,
		ratio: Ratio = 'auto'
	): Promise<string> {
		if (!mimeTypes.some((mime) => file.originalname.endsWith(mime))) {
			throw new BadRequestException(
				'Недопустимый формат файла (только .JPG, .JPEG или .PNG)'
			)
		}

		await fs.mkdir(fileDir, { recursive: true })

		const fileName = uuid()
		const fileExt = '.webp'
		const outputPath = path.join(fileDir, fileName + fileExt)

		const watermark = await this.loadWatermark()

		let pipeline = sharp(file.buffer).withMetadata()

		const metadata = await pipeline.metadata()

		const origWidth = metadata.width || 0
		const origHeight = metadata.height || 0

		let appliedRatio: Ratio = ratio

		if (ratio === 'auto') {
			if (origWidth > origHeight) {
				appliedRatio = '4:3'
			} else if (origHeight > origWidth) {
				appliedRatio = '3:4'
			} else {
				appliedRatio = '1:1'
			}
		}

		if (appliedRatio === 'auto') {
			pipeline = pipeline.resize({
				width: origWidth > 1920 ? 1920 : undefined,
				height: origHeight > 1440 ? 1440 : undefined,
				fit: 'cover',
				withoutEnlargement: true
			})
		} else {
			const target = ASPECT_PRESETS[appliedRatio]
			pipeline = pipeline.resize({
				width: target.width,
				height: target.height,
				fit: 'cover',
				withoutEnlargement: true
			})
		}

		if (watermark) {
			pipeline = pipeline.composite([
				{
					input: watermark,
					gravity: 'southeast',
					blend: 'over'
				}
			])
		}

		await pipeline
			.webp({ quality: 80, lossless: true, force: true })
			.toFile(outputPath)

		return `products/${fileName + fileExt}`
	}
}
