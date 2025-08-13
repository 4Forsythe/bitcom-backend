import * as fs from 'fs'
import * as path from 'path'
import * as sharp from 'sharp'
import { Workbook } from 'exceljs'

import type { ProductType } from 'src/product/types/product.types'

const fileDir = path.join(process.env.FILE_STORAGE_URL, 'static')

function toArrayBuffer(buffer: Buffer) {
	return buffer.buffer.slice(
		buffer.byteOffset,
		buffer.byteOffset + buffer.byteLength
	)
}

export async function generateExcelWorkbook(
	workbook: Workbook,
	products: ProductType[]
) {
	const sheet = workbook.addWorksheet('sheet')

	sheet.columns = [
		{ header: 'Фото', key: 'image', width: 18 },
		{ header: 'Название', key: 'name', width: 30 },
		{ header: 'Описание', key: 'description', width: 50 },
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

	sheet.getRow(1).eachCell((cell) => {
		cell.font = { bold: true }
		cell.fill = {
			type: 'pattern',
			pattern: 'solid',
			fgColor: { argb: 'FFCCCCCC' }
		}

		cell.alignment = { horizontal: 'center', vertical: 'middle' }
	})

	sheet.getColumn('D').numFmt = '#,##0.00'
	sheet.getColumn('E').numFmt = '#,##0.00'

	for (const product of products) {
		try {
			const row = sheet.addRow({
				name: product.name,
				description: product.description,
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

			sheet.getRow(row.number).height = 130 * 0.75

			sheet.addImage(imageId, {
				tl: { col: 0, row: row.number - 1 },
				ext: { width: 130, height: 130 },
				editAs: 'oneCell'
			})
		} catch (error) {
			console.error('Failed to generateExcelWorkbook:', error)
		}
	}
}
