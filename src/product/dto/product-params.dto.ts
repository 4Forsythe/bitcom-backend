export enum ProductSortEnum {
	NAME = 'name',
	PRICE = 'price',
	DISCOUNT = 'discountPrice',
	CREATED_AT = 'createdAt',
	COUNT = 'count'
}

export class ProductParamsDto {
	ids?: string[]
	name?: string
	categoryId?: string
	isPublished?: boolean
	isArchived?: boolean
	onlyOriginalPrice?: boolean
	sortBy?: ProductSortEnum
	orderBy?: 'desc' | 'asc'
	take?: number
	skip?: number
}
