import { type ProductCategory } from '@prisma/client'

export type ProductCategoryWithChildren = ProductCategory & {
	children: ProductCategoryWithChildren[]
}
