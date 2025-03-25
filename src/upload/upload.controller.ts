import {
	Post,
	Controller,
	UseInterceptors,
	UploadedFiles,
	BadRequestException,
	UseGuards
} from '@nestjs/common'
import { FilesInterceptor } from '@nestjs/platform-express'

import { SharpPipe } from './sharp.pipe'
import { BasicAuthGuard } from 'src/auth.guard'
import { UploadService } from './upload.service'

@Controller('upload')
export class UploadController {
	constructor(private readonly uploadService: UploadService) {}

	@Post()
	@UseGuards(BasicAuthGuard)
	@UseInterceptors(FilesInterceptor('file'))
	async upload(@UploadedFiles(SharpPipe) files: Express.Multer.File[]) {
		if (!files)
			throw new BadRequestException('Недостаточно файлов для загрузки')

		return this.uploadService.create(files)
	}
}
