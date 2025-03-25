import { Injectable } from '@nestjs/common'

@Injectable()
export class UploadService {
	async create(files: Express.Multer.File[]) {
		return files
	}
}
