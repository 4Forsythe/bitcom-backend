import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common'

@Injectable()
export class BasicAuthGuard implements CanActivate {
	USERNAME = process.env.BASIC_AUTH_USERNAME
	PASSWORD = process.env.BASIC_AUTH_PASSWORD

	canActivate(ctx: ExecutionContext): boolean {
		const req = ctx.switchToHttp().getRequest()
		const auth: string = req.headers.authorization

		if (!auth || !auth.startsWith('Basic')) return false

		const base64 = auth.split(' ')[1]
		const credentials = Buffer.from(base64, 'base64').toString('ascii')

		const [username, password] = credentials.split(':')

		if (username === this.USERNAME && password === this.PASSWORD) return true

		return false
	}
}
