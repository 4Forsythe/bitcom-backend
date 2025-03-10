import { InternalServerErrorException } from '@nestjs/common'

import axios from 'axios'

export const sendTelegramMessage = async (chatId: string, message: string) => {
	const BOT_TOKEN = process.env.BOT_TOKEN
	const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`

	try {
		await axios.post(telegramUrl, {
			chat_id: chatId,
			text: message,
			parse_mode: 'HTML'
		})
	} catch (error) {
		console.error('sendTelegramMessage: sending message error')
		throw new InternalServerErrorException('Send message to Telegram error')
	}
}
