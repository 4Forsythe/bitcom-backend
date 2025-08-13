import { Product } from '@prisma/client'

export type ProductType = {
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
