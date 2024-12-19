import {
	Controller,
	Post,
	UseInterceptors,
	UploadedFiles,
	BadRequestException,
	UseGuards
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'

import { BasicAuthGuard } from 'src/auth.guard'
import { UploadService } from './upload.service'

@Controller('upload')
export class UploadController {
	constructor(private readonly uploadService: UploadService) {}

	@Post()
	@UseGuards(BasicAuthGuard)
	@UseInterceptors(FileInterceptor('file'))
	create(@UploadedFiles() files: Express.Multer.File[]) {
		if (!files)
			throw new BadRequestException('Недостаточно файлов для загрузки')

		return true
	}
}
