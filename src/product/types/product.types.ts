import {
	Prisma,
	Product,
	DiscountType,
	DiscountTargetType
} from '@prisma/client'

export type ProductWithImagesAndCategories = {
	images: {
		id: string
		url: string
		productId: string
		sortOrder: number
	}[]
	category: {
		id: string
		name: string
		imageUrl: string
		parentId: string
		sortOrder: number
	}
} & Product

export type ProductResponse = ProductWithImagesAndCategories & {
	discount?: {
		id: string
		name: string
		type: DiscountType
		targetType: DiscountTargetType
		amount: string
		priority: number
		startedAt: string
		expiresAt: string
	}
}

export type ProductWithDiscountTargets = ProductWithImagesAndCategories &
	Prisma.ProductGetPayload<{
		include: {
			discountTargets: {
				include: {
					discount: true
				}
			}
			category: true
		}
	}>
