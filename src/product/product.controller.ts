import { Response } from 'express'
import {
	Controller,
	Get,
	Post,
	Patch,
	Param,
	Body,
	Query,
	UseInterceptors,
	UploadedFiles,
	ValidationPipe,
	BadRequestException,
	ForbiddenException,
	Res
} from '@nestjs/common'
import { FileFieldsInterceptor } from '@nestjs/platform-express'
import { validate } from 'class-validator'
import { plainToInstance } from 'class-transformer'

import { ProductService } from './product.service'
import { UserService } from 'src/user/user.service'
import { CreateProductDto } from './dto/create-product.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import { ProductParamsDto } from './dto/product-params.dto'
import { ProductExportParamsDto } from './dto/product-export-params.dto'
import { UpdateProductImagesDto } from './dto/update-product-images.dto'

import { Auth } from 'src/auth/auth.decorator'
import { User } from 'src/user/user.decorator'

@Controller('product')
export class ProductController {
	constructor(
		private readonly productService: ProductService,
		private readonly userService: UserService
	) {}

	@Post()
	@Auth()
	async create(@User('id') userId: string, @Body() dto: CreateProductDto) {
		const user = await this.userService.getOne(userId)

		if (!user.role) {
			throw new ForbiddenException('Нет доступа к этому ресурсу')
		}

		return this.productService.create(dto)
	}

	@Post(':id/upload-images')
	@Auth()
	@UseInterceptors(FileFieldsInterceptor([{ name: 'images', maxCount: 5 }]))
	async uploadImages(
		@User('id') userId: string,
		@Param('id') id: string,
		@Body('orders') sortOrders: string,
		@Body('product', new ValidationPipe({ transform: true })) product: string,
		@UploadedFiles() files: { images?: Express.Multer.File[] }
	) {
		const user = await this.userService.getOne(userId)

		if (!user.role) {
			throw new ForbiddenException('Нет доступа к этому ресурсу')
		}

		let dto: { preserved: string[] }
		let orders: number[]

		try {
			dto = JSON.parse(product)
		} catch (error) {
			throw new BadRequestException('Invalid JSON string')
		}

		orders = sortOrders ? JSON.parse(sortOrders) : null

		const transformed = plainToInstance(UpdateProductImagesDto, dto)
		const errors = await validate(transformed)

		if (errors.length > 0) {
			throw new BadRequestException(errors)
		}

		return this.productService.uploadImages(id, files, orders, transformed)
	}

	@Patch(':id')
	@Auth()
	async update(
		@User('id') userId: string,
		@Param('id') id: string,
		@Body() dto: UpdateProductDto
	) {
		const user = await this.userService.getOne(userId)

		if (!user.role) {
			throw new ForbiddenException('Нет доступа к этому ресурсу')
		}

		return this.productService.update(id, dto)
	}

	@Get()
	getAll(@Query() params?: ProductParamsDto) {
		return this.productService.getAll(params)
	}

	@Get('archive')
	@Auth()
	async getArchive(
		@User('id') userId: string,
		@Query() params?: ProductParamsDto
	) {
		const user = await this.userService.getOne(userId)

		if (!user.role) {
			throw new ForbiddenException('Нет доступа к этому ресурсу')
		}

		return this.productService.getArchive(params)
	}

	@Get('discount')
	getDiscounts(@Query() params?: ProductParamsDto) {
		return this.productService.getDiscount(params)
	}

	@Get('similar/:id')
	getSimilar(@Param('id') id: string, @Query() params?: { take: number }) {
		return this.productService.getSimilar(id, params)
	}

	@Get('total')
	getTotal() {
		return this.productService.getTotal()
	}

	@Get('export')
	exportFile(@Res() res: Response, @Query() params?: ProductExportParamsDto) {
		return this.productService.getXLSX(res)
	}

	@Post()
	getByIds(@Body() dto: { ids: string[] }) {
		return this.productService.getByIds(dto.ids)
	}

	@Get(':id')
	getOne(@Param('id') id: string) {
		return this.productService.getOne(id)
	}
}
