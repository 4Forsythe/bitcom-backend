import { Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Injectable()
export class OptionalAuthGuard extends AuthGuard('jwt') {
	handleRequest(err: any, user: any) {
		if (!user) return null

		return user
	}
}
