import * as fs from 'fs'
import * as path from 'path'
import { Response } from 'express'
import { Injectable, NotFoundException } from '@nestjs/common'

import { sendMail } from './lib/send-mail'
import { sendTelegramMessage } from './lib/send-telegram-message'
import { CreateServiceRequestDto } from './dto/create-service-request.dto'

const fileDir = path.join(process.env.FILE_STORAGE_URL, 'static')

@Injectable()
export class AppService {
	SITE_BASE_URL = process.env.SITE_BASE_URL
	RECIPIENT_EMAIL = process.env.RECIPIENT_EMAIL
	BOT_CHAT_ID = process.env.BOT_REPLY_CHAT_ID

	getHello(): string {
		return 'Server is running...'
	}

	getStaticFile(filename: string, res: Response) {
		const filePath = path.join(fileDir, filename)

		if (!fs.existsSync(filePath)) {
			throw new NotFoundException('File is not found')
		}

		return res.sendFile(filename, { root: fileDir })
	}

	async sendServiceRequest(dto: CreateServiceRequestDto) {
		const now = new Date()

		await sendMail({
			to: this.RECIPIENT_EMAIL,
			subject: 'Новая заявка в сервисный центр',
			html: {
				path: 'src/templates/service-request.template.html',
				replacements: {
					name: dto.name,
					email: dto.email,
					phone: dto.phone,
					request: dto.request,
					comment: dto.comment,
					createdAt: now.toLocaleString()
				}
			}
		})

		const html = `
						🛠️ <b>Новая заявка в сервисный центр</b>
		
						Дата создания: <b>${now.toLocaleString()}</b>
		
						🙋‍♂️ <u>Контактные данные</u>:
		
						${dto.name}
						${dto.email}
						${dto.phone}
		
						💭 <u>Причина обращения</u>:
		
						${dto.request}
		
						💭 <u>Комментарий мастеру</u>:

						${dto.comment}
		
						<blockquote>Это сообщение было продублировано с контактной почты <b>${this.RECIPIENT_EMAIL}</b></blockquote>
					`
			.split('\n')
			.map((line) => line.trim())
			.join('\n')

		await sendTelegramMessage(this.BOT_CHAT_ID, html)
	}
}
