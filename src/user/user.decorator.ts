import { createParamDecorator, ExecutionContext } from '@nestjs/common'

import type { User as UserModel } from '@prisma/client'

export const User = createParamDecorator(
	(data: keyof UserModel, ctx: ExecutionContext) => {
		const request = ctx.switchToHttp().getRequest()
		const user = request.user

		if (!user) return null

		return data ? user[data] : user
	}
)
