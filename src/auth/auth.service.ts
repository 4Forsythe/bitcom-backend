import {
	Injectable,
	BadRequestException,
	UnauthorizedException,
	ForbiddenException
} from '@nestjs/common'

import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'

import { verify } from 'argon2'
import { Response } from 'express'
import { addMinutes } from 'date-fns'

import { UserService } from 'src/user/user.service'
import { PrismaService } from 'src/prisma.service'
import { AuthLoginDto } from './dto/auth-login.dto'
import { AuthRegisterDto } from './dto/auth-register.dto'
import { sendMail } from 'src/lib/send-mail'

@Injectable()
export class AuthService {
	constructor(
		private jwt: JwtService,
		private userService: UserService,
		private configService: ConfigService,
		private prisma: PrismaService
	) {}

	COOKIE_SECURE = Boolean(process.env.COOKIE_SECURE)
	REFRESH_TOKEN_NAME = 'REFRESH_TOKEN'
	EXPIRE_DAY_REFRESH_TOKEN = 30
	SEND_CODE_COOLDOWN = 1

	async login(dto: AuthLoginDto) {
		const { password, ...user } = await this.validateUser(dto)

		const tokens = this.issueTokens(user.id)

		return { user, ...tokens }
	}

	async register(dto: AuthRegisterDto) {
		const response = await this.prisma.user.findUnique({
			where: { email: dto.email }
		})

		if (response) throw new BadRequestException('Введенный E-mail уже занят')

		const user = await this.userService.create(dto)

		await this.sendCode(user.email)

		const tokens = this.issueTokens(user.id)

		return { user, ...tokens }
	}

	async sendCode(email: string) {
		const user = await this.prisma.user.findUnique({
			where: { email }
		})

		if (!user) throw new BadRequestException('Пользователь не найден')

		const code = await this.userService.generateCode(user.id)

		await sendMail({
			to: email,
			subject: 'Подтвердите ваш E-mail',
			html: {
				path: 'src/templates/confirm-email.template.html',
				replacements: {
					code: String(code),
					returnUrl: `${process.env.BASE_URL}/auth/verify?code=${code}&userId=${user.id}`
				}
			}
		})
	}

	async checkCooldown(userId: string) {
		const userCode = await this.prisma.userCode.findUnique({
			where: { userId, attempt: { gte: 5 } }
		})

		if (!userCode) return

		const now = new Date()
		const firstCooldown = addMinutes(userCode.lastAttemptAt, 5)

		if (userCode.lastAttemptAt && now < firstCooldown) {
			const period = this.generateCooldown(userCode.attempt)
			const cooldown = addMinutes(userCode.lastAttemptAt, period)

			if (now < cooldown) {
				const seconds = Math.floor((cooldown.getTime() - now.getTime()) / 1000)

				throw new ForbiddenException(
					`Превышено количество попыток. Попробуйте позже`
				)
			}
		}

		return
	}

	private generateCooldown(attempt: number) {
		const timing = this.SEND_CODE_COOLDOWN

		const periods = [timing, timing * 5, timing * 5, timing * 5]

		return periods[Math.min(attempt, periods.length - 1)]
	}

	async verify(code: string, userId: string) {
		const user = await this.prisma.user.findUnique({
			where: { id: userId }
		})

		const userCode = await this.prisma.userCode.findUnique({
			where: { userId }
		})

		if (!user) throw new BadRequestException('Пользователь не найден')
		if (!userCode) throw new BadRequestException('Код подтверждения не найден')

		if (user.isActive)
			throw new BadRequestException('Пользователь уже подтвержден')

		await this.checkCooldown(user.id)

		const isValidCode = await this.prisma.userCode.findUnique({
			where: {
				code,
				userId: user.id,
				expiresAt: {
					gt: new Date()
				}
			}
		})

		await this.prisma.userCode.update({
			where: { userId: user.id },
			data: {
				attempt: { increment: 1 },
				lastAttemptAt: new Date()
			}
		})

		if (!isValidCode)
			throw new BadRequestException('Введен неверный код активации')

		await this.prisma.userCode.delete({
			where: { id: userCode.id }
		})

		return this.prisma.user.update({
			where: { id: user.id },
			data: {
				isActive: true
			}
		})
	}

	private issueTokens(userId: string) {
		const data = { id: userId }

		const accessToken = this.jwt.sign(data, {
			expiresIn: '14d'
		})

		const refreshToken = this.jwt.sign(data, {
			expiresIn: '30d'
		})

		return { accessToken, refreshToken }
	}

	private async validateUser(dto: AuthLoginDto) {
		const user = await this.prisma.user.findUnique({
			where: { email: dto.email }
		})

		if (!user) throw new UnauthorizedException('Такого пользователя нет')

		const isValid = await verify(user.password, dto.password)

		if (!isValid) throw new UnauthorizedException('Неверный логин или пароль')

		return user
	}

	async getTokens(refreshToken: string) {
		const userToken = await this.jwt.verifyAsync(refreshToken)

		if (!userToken)
			throw new UnauthorizedException('Введен неверный токен обновления')

		const user = await this.userService.getOne(userToken.id)
		const tokens = this.issueTokens(user.id)

		return {
			user,
			...tokens
		}
	}

	createRefreshToken(res: Response, refreshToken: string) {
		const expiresIn = new Date()
		expiresIn.setDate(expiresIn.getDate() + this.EXPIRE_DAY_REFRESH_TOKEN)

		res.cookie(this.REFRESH_TOKEN_NAME, refreshToken, {
			httpOnly: true,
			secure: this.COOKIE_SECURE || true /* true - только для https */,
			domain: this.configService.get('SITE_DOMAIN'),
			expires: expiresIn,
			sameSite: 'lax'
		})
	}

	removeRefreshToken(res: Response) {
		res.cookie(this.REFRESH_TOKEN_NAME, '', {
			httpOnly: true,
			secure: this.COOKIE_SECURE || true /* true - только для https */,
			domain: this.configService.get('SITE_DOMAIN'),
			expires: new Date(0),
			sameSite: 'lax'
		})
	}
}
