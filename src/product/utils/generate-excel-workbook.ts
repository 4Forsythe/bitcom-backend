import * as fs from 'fs'
import * as path from 'path'
import * as sharp from 'sharp'
import { Workbook, type Worksheet } from 'exceljs'

import type { ProductWithImagesAndCategories } from 'src/product/types/product.types'
import type { ProductCategoryWithChildren } from 'src/product-category/types/product-category.types'

const fileDir = path.join(process.env.FILE_STORAGE_URL, 'static')

async function renderCategoryTree(
	workbook: Workbook,
	sheet: Worksheet,
	category: ProductCategoryWithChildren,
	productMapping: Record<string, ProductWithImagesAndCategories[]>,
	deep: number = 0
) {
	const row = sheet.addRow([`${'  '.repeat(deep)}${category.name}`])

	row.font = { bold: true }
	row.alignment = { horizontal: 'left' }
	row.eachCell((cell) => {
		cell.font = {
			color: { argb: 'FFFFFFFF' }
		}
		cell.fill = {
			type: 'pattern',
			pattern: 'solid',
			fgColor: { argb: 'FF242424' }
		}
	})

	sheet.mergeCells(row.number, 1, row.number, 6)

	const products = productMapping[category.id] || []

	for (const product of products) {
		try {
			const dataRow = sheet.addRow({
				name: product.name,
				description: product.description,
				count: product.count,
				price: Number(product.price),
				discountPrice: product.discountPrice
					? Number(product.discountPrice)
					: ''
			})

			if (product.images.length === 0) continue

			const imagePath = path.join(fileDir, product.images[0].url)

			const fileBuffer = await fs.promises.readFile(imagePath)
			const fileExtension = path.extname(imagePath).toLowerCase()

			let imageBuffer: Buffer
			let imageExtension: 'png' | 'jpeg' = 'jpeg'

			if (fileExtension === '.jpg' || fileExtension === '.jpeg') {
				imageBuffer = fileBuffer
				imageExtension = 'jpeg'
			} else if (fileExtension === '.png') {
				imageBuffer = fileBuffer
				imageExtension = 'png'
			} else {
				imageBuffer = await sharp(fileBuffer).jpeg().toBuffer()
				imageExtension = 'jpeg'
			}

			const imageId = workbook.addImage({
				buffer: toArrayBuffer(imageBuffer) as any,
				extension: 'jpeg'
			})

			sheet.getRow(dataRow.number).height = 130 * 0.75

			sheet.addImage(imageId, {
				tl: { col: 0, row: dataRow.number - 1 },
				ext: { width: 130, height: 130 },
				editAs: 'oneCell'
			})
		} catch (error) {
			console.error('Failed to generateExcelWorkbook:', error)
		}
	}

	if (category.children && category.children.length > 0) {
		for (const child of category.children) {
			await renderCategoryTree(workbook, sheet, child, productMapping, deep + 1)
		}
	}
}

function toArrayBuffer(buffer: Buffer) {
	return buffer.buffer.slice(
		buffer.byteOffset,
		buffer.byteOffset + buffer.byteLength
	)
}

export async function generateExcelWorkbook(
	workbook: Workbook,
	categories: ProductCategoryWithChildren[],
	products: ProductWithImagesAndCategories[]
) {
	const sheet = workbook.addWorksheet('sheet')

	sheet.columns = [
		{ header: 'Фото', key: 'image', width: 18 },
		{ header: 'Название', key: 'name', width: 30 },
		{ header: 'Описание', key: 'description', width: 50 },
		{ header: 'Остаток (шт.)', key: 'count', width: 20 },
		{ header: 'Розничная цена', key: 'price', width: 20 },
		{ header: 'Скидочная цена', key: 'discountPrice', width: 20 }
	]

	sheet.columns.forEach((column) => {
		column.alignment = {
			horizontal: 'left',
			vertical: 'middle',
			wrapText: true
		}
	})

	sheet.getColumn('D').alignment = {
		horizontal: 'center',
		vertical: 'middle',
		wrapText: true
	}
	sheet.getColumn('E').alignment = {
		horizontal: 'center',
		vertical: 'middle',
		wrapText: true
	}
	sheet.getColumn('F').alignment = {
		horizontal: 'center',
		vertical: 'middle',
		wrapText: true
	}

	sheet.getRow(1).eachCell((cell) => {
		cell.font = { bold: true }
		cell.fill = {
			type: 'pattern',
			pattern: 'solid',
			fgColor: { argb: 'FFCCCCCC' }
		}

		cell.alignment = { horizontal: 'center', vertical: 'middle' }
	})

	sheet.getColumn('E').numFmt = '#,##0.00'
	sheet.getColumn('F').numFmt = '#,##0.00'

	const productMapping: Record<string, ProductWithImagesAndCategories[]> = {}

	for (const product of products) {
		if (!product.category.id) continue

		if (!productMapping[product.category.id]) {
			productMapping[product.category.id] = []
		}

		productMapping[product.category.id].push(product)
	}

	for (const category of categories) {
		await renderCategoryTree(workbook, sheet, category, productMapping)
	}
}
