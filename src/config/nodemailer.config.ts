import * as nodemailer from 'nodemailer'

const user = process.env.EMAIL_USER
const pass = process.env.EMAIL_PASSWORD

export const transporter = nodemailer.createTransport({
	service: 'Yandex',
	port: 465,
	secure: true,
	auth: {
		user,
		pass
	},
	tls: {
		rejectUnauthorized: true
	}
})

export const mailOptions = {
	from: `БитКом <${user}>`
}
