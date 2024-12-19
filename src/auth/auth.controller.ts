import {
	Controller,
	Req,
	Res,
	Post,
	Body,
	UnauthorizedException,
	Query,
	Get
} from '@nestjs/common'

import type { Request, Response } from 'express'

import { AuthService } from './auth.service'
import { AuthLoginDto } from './dto/auth-login.dto'
import { AuthRegisterDto } from './dto/auth-register.dto'
import { AuthVerifyDto } from './dto/auth-verify.dto'
import { AuthSendCodeDto } from './dto/auth-send-code.dto'

@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Post('login')
	async login(
		@Body() dto: AuthLoginDto,
		@Res({ passthrough: true }) res: Response
	) {
		const { refreshToken, ...response } = await this.authService.login(dto)

		this.authService.createRefreshToken(res, refreshToken)

		return response
	}

	@Post('login/extend')
	async getTokens(
		@Req() req: Request,
		@Res({ passthrough: true })
		res: Response
	) {
		const refreshTokenFromCookies =
			req.cookies[this.authService.REFRESH_TOKEN_NAME]

		if (!refreshTokenFromCookies) {
			this.authService.removeRefreshToken(res)
			throw new UnauthorizedException('Refresh token is not passed')
		}

		const { refreshToken, ...response } = await this.authService.getTokens(
			refreshTokenFromCookies
		)

		this.authService.createRefreshToken(res, refreshToken)

		return response
	}

	@Post('register')
	async register(
		@Body() dto: AuthRegisterDto,
		@Res({ passthrough: true }) res: Response
	) {
		const { refreshToken, ...response } = await this.authService.register(dto)

		this.authService.createRefreshToken(res, refreshToken)

		return response
	}

	@Post('send-code')
	async sendCode(@Query() params: AuthSendCodeDto) {
		await this.authService.sendCode(params.email)

		return true
	}

	@Get('verify')
	async verify(@Query() params: AuthVerifyDto, @Res() res: Response) {
		await this.authService.verify(params.code, params.userId)

		return res.redirect(process.env.SITE_BASE_URL)
	}

	@Post('logout')
	async logout(@Res({ passthrough: true }) res: Response) {
		this.authService.removeRefreshToken(res)

		return true
	}
}
