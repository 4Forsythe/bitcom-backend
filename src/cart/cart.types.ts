import { Prisma } from '@prisma/client'

export type CartWithDiscounts = Prisma.CartGetPayload<{
	include: {
		items: {
			include: {
				product: {
					include: {
						discountTargets: {
							include: {
								discount: true
							}
						}
						category: {
							include: {
								discountTargets: {
									include: {
										discount: true
									}
								}
							}
						}
					}
				}
			}
		}
	}
}>
