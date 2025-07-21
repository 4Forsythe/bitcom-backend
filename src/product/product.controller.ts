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
	BadRequestException
} from '@nestjs/common'
import { validate } from 'class-validator'
import { plainToInstance } from 'class-transformer'

import { ProductService } from './product.service'
import { CreateProductDto } from './dto/create-product.dto'
import { ProductParamsDto } from './dto/product-params.dto'
import { FileFieldsInterceptor } from '@nestjs/platform-express'
import { UpdateProductImagesDto } from './dto/update-product-images.dto'
import { UpdateProductDto } from './dto/update-product.dto'

@Controller('product')
export class ProductController {
	constructor(private readonly productService: ProductService) {}

	@Post()
	async create(@Body() dto: CreateProductDto) {
		return this.productService.create(dto)
	}

	@Post(':id/upload-images')
	@UseInterceptors(FileFieldsInterceptor([{ name: 'images', maxCount: 5 }]))
	async uploadImages(
		@Param('id') id: string,
		@Body('product', new ValidationPipe({ transform: true })) body: string,
		@UploadedFiles() files: { images?: Express.Multer.File[] }
	) {
		let dto: { preserved: string[] }

		try {
			dto = JSON.parse(body)
		} catch (error) {
			throw new BadRequestException('Invalid JSON string')
		}

		const transformed = plainToInstance(UpdateProductImagesDto, dto)
		const errors = await validate(transformed)

		if (errors.length > 0) {
			throw new BadRequestException(errors)
		}

		return this.productService.uploadImages(id, files, transformed)
	}

	@Patch(':id')
	async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
		return this.productService.update(id, dto)
	}

	@Get()
	getAll(@Query() params?: ProductParamsDto) {
		return this.productService.getAll(params)
	}

	@Get('similar/:id')
	getSimilar(@Param('id') id: string, @Query() params?: { take: number }) {
		return this.productService.getSimilar(id, params)
	}

	@Get('total')
	getTotal() {
		return this.productService.getTotal()
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
