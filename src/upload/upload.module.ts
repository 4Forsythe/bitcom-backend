import { Module } from '@nestjs/common'
import { MulterModule } from '@nestjs/platform-express'
import { diskStorage } from 'multer'

import { UploadService } from './upload.service'
import { UploadController } from './upload.controller'

@Module({
	imports: [
		MulterModule.register({
			storage: diskStorage({
				destination: './static',
				filename: (req, file, cb) => {
					cb(null, file.originalname)
				}
			})
		})
	],
	controllers: [UploadController],
	providers: [UploadService]
})
export class UploadModule {}
