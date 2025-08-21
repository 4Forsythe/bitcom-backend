import {
	Controller,
	Get,
	Post,
	Query,
	Body,
	Patch,
	Param,
	Delete,
	ForbiddenException
} from '@nestjs/common'

import { DiscountService } from './discount.service'
import { CreateDiscountDto } from './dto/create-discount.dto'
import { UpdateDiscountDto } from './dto/update-discount.dto'
import { DiscountParamsDto } from './dto/discount-params.dto'
import { Auth } from 'src/auth/auth.decorator'
import { User } from 'src/user/user.decorator'
import { UserService } from 'src/user/user.service'

@Controller('discount')
export class DiscountController {
	constructor(
		private readonly userService: UserService,
		private readonly discountService: DiscountService
	) {}

	@Post()
	@Auth()
	async create(@User('id') userId: string, @Body() dto: CreateDiscountDto) {
		const user = await this.userService.getOne(userId)

		if (!user.role) {
			throw new ForbiddenException('Нет доступа к этому ресурсу')
		}

		return this.discountService.create(dto)
	}

	@Get()
	getAll(@Query() params?: DiscountParamsDto) {
		return this.discountService.getAll(params)
	}

	@Get('actial')
	getActual(@Query() params?: DiscountParamsDto) {
		return this.discountService.getActual(params)
	}

	@Get(':id')
	getOne(@Param('id') id: string) {
		return this.discountService.getOne(id)
	}

	@Patch(':id')
	@Auth()
	async update(
		@User('id') userId: string,
		@Param('id') id: string,
		@Body() dto: UpdateDiscountDto
	) {
		const user = await this.userService.getOne(userId)

		if (!user.role) {
			throw new ForbiddenException('Нет доступа к этому ресурсу')
		}

		return this.discountService.update(id, dto)
	}

	@Delete(':id')
	@Auth()
	async remove(@User('id') userId: string, @Param('id') id: string) {
		const user = await this.userService.getOne(userId)

		if (!user.role) {
			throw new ForbiddenException('Нет доступа к этому ресурсу')
		}

		return this.discountService.remove(id)
	}
}
