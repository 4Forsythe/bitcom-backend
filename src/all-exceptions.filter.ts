import {
	Catch,
	Logger,
	HttpException,
	ArgumentsHost,
	ExceptionFilter
} from '@nestjs/common'

import { Response, Request } from 'express'
import { sendTelegramMessage } from './lib/send-telegram-message'

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
	NODE_ENV = process.env.NODE_ENV
	BOT_CHAT_ID = process.env.BOT_REPORT_CHAT_ID

	private readonly logger = new Logger(AllExceptionsFilter.name)

	catch(exception: unknown, host: ArgumentsHost) {
		const ctx = host.switchToHttp()
		const request = ctx.getRequest<Request>()
		const response = ctx.getResponse<Response>()

		let status = 500
		let message = 'Internal server error'

		if (exception instanceof HttpException) {
			status = exception.getStatus()
			message = exception.message
		}

		let log = `${request.method} ${status}: ${message} in ${request.url}`

		if (status >= 500) {
			this.logger.error(log, (exception as any)?.stack || '')

			this.sendErrorNotification(log)
		}

		response.status(status).json({
			...(exception instanceof HttpException
				? typeof exception.getResponse() === 'object'
					? { ...(exception.getResponse() as object) }
					: { error: exception.getResponse() }
				: { error: 'Unknown Error' }),
			timestamp: new Date().toISOString()
		})
	}

	private async sendErrorNotification(log: string) {
		const html = `
				<b>[${this.NODE_ENV}] Bitcom</b>
        ${log}
			`
			.split('\n')
			.map((line) => line.trim())
			.join('\n')

		await sendTelegramMessage(this.BOT_CHAT_ID, html)
	}
}
