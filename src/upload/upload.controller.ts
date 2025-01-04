import {
	Controller,
	Post,
	UseInterceptors,
	UploadedFiles,
	BadRequestException,
	UseGuards,
	UploadedFile
} from '@nestjs/common'
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express'

import { BasicAuthGuard } from 'src/auth.guard'
import { UploadService } from './upload.service'
import { SharpPipe } from './sharp.pipe'

@Controller('upload')
export class UploadController {
	constructor(private readonly uploadService: UploadService) {}

	@Post('single')
	@UseGuards(BasicAuthGuard)
	@UseInterceptors(FileInterceptor('file'))
	async uploadSingle(@UploadedFile(SharpPipe) file: Express.Multer.File) {
		if (!file) throw new BadRequestException('Недостаточно файлов для загрузки')

		return true
	}

	@Post('multiple')
	@UseGuards(BasicAuthGuard)
	@UseInterceptors(FilesInterceptor('file'))
	async uploadMultiple(@UploadedFiles(SharpPipe) files: Express.Multer.File[]) {
		if (!files)
			throw new BadRequestException('Недостаточно файлов для загрузки')

		return true
	}
}
