import { Module } from '@nestjs/common'
import { MulterModule } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'

import { UploadService } from './upload.service'
import { UploadController } from './upload.controller'

@Module({
	imports: [
		MulterModule.register({
			storage: memoryStorage(),
			limits: { fileSize: 50 * 1024 * 1024 }
		})
	],
	controllers: [UploadController],
	providers: [UploadService]
})
export class UploadModule {}
