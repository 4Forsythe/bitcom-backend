export enum DiscountSortEnum {
	NAME = 'name',
	AMOUNT = 'amount',
	STARTED_AT = 'startedAt',
	EXPIRES_AT = 'expiresAt'
}

export class DiscountParamsDto {
	name?: string
	categoryId?: string
	sortBy?: DiscountSortEnum
	orderBy?: 'desc' | 'asc'
	take?: number
	skip?: number
}
