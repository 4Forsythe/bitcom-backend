import { PrismaClient } from '@prisma/client'

import { hash } from 'argon2'
import { faker } from '@faker-js/faker'

const categories = [
	'Компьютерная техника',
	'Офисная техника',
	'Аудио и видео',
	'Сетевое оборудование',
	'Оборудование для бизнеса',
	'Медицинское оборудование',
	'Серверное оборудование',
	'Раритеты'
]

const subcategories = [
	[
		{
			name: 'Телевизоры',
			parent: 'Аудио и видео'
		},
		{
			name: 'Мониторы',
			parent: 'Аудио и видео'
		},
		{
			name: 'Видеонаблюдение',
			parent: 'Аудио и видео'
		},
		{
			name: 'Проекторы',
			parent: 'Аудио и видео'
		},
		{
			name: 'Гарнитура',
			parent: 'Аудио и видео'
		}
	],

	[
		{
			name: 'МФУ и сканеры',
			parent: 'Офисная техника'
		},
		{
			name: 'Принтеры',
			parent: 'Офисная техника'
		},
		{
			name: 'ИБП',
			parent: 'Офисная техника'
		}
	],

	[
		{
			name: 'Ноутбуки',
			parent: 'Компьютерная техника'
		},
		{
			name: 'Настольные компьютеры',
			parent: 'Компьютерная техника'
		},
		{
			name: 'Комплектующие',
			parent: 'Компьютерная техника'
		},
		{
			name: 'Периферия',
			parent: 'Компьютерная техника'
		},
		{
			name: 'Кабели и переходники',
			parent: 'Компьютерная техника'
		}
	]
]

const subsubcategories = [
	{
		name: 'Видеокарты',
		parent: 'Комплектующие'
	},
	{
		name: 'Жесткие диски',
		parent: 'Комплектующие'
	},
	{
		name: 'Блоки питания',
		parent: 'Комплектующие'
	},
	{
		name: 'Процессоры',
		parent: 'Комплектующие'
	},
	{
		name: 'Оперативная память',
		parent: 'Комплектующие'
	},
	{
		name: 'Материнские платы',
		parent: 'Комплектующие'
	},
	{
		name: 'Системы охлаждения',
		parent: 'Комплектующие'
	},
	{
		name: 'Корпуса',
		parent: 'Комплектующие'
	}
]

const prisma = new PrismaClient()

async function main() {
	try {
		await prisma.product.createMany({
			data: Array.from({ length: 50 }, (_, index) => {
				return {
					name: `Товар №${index}`,
					slug: `tovar-${index}`,
					categoryId: 'af285c91-7ea7-4603-9de2-c330660351d9',
					price: 20000,
					count: 5,
					isPublished: true
				}
			})
		})

		// await down()
		// await up()
	} catch (error) {
		console.error(error)
	}
}

async function up() {
	const createdCategories = {}
	const createdSubcategories = {}

	for (const [index, name] of categories.entries()) {
		const createdCategory = await prisma.productCategory.create({
			data: {
				name,
				imageUrl: `catalog/00${index + 1}.png`,
				sortOrder: index
			}
		})
		createdCategories[name] = createdCategory.id
	}

	for (const part of subcategories) {
		for (const [index, subcategory] of part.entries()) {
			const parentId = createdCategories[subcategory.parent]
			if (!parentId) {
				console.warn(
					`Не найдена родительская категория для ${subcategory.name}`
				)
				continue
			}

			const createdSubcategory = await prisma.productCategory.create({
				data: {
					name: subcategory.name,
					parentId,
					sortOrder: index
				}
			})
			createdSubcategories[subcategory.name] = createdSubcategory.id
		}
	}

	for (const [index, subsubcategory] of subsubcategories.entries()) {
		const parentId = createdSubcategories[subsubcategory.parent]
		if (!parentId) {
			console.warn(
				`Не найдена родительская категория для ${subsubcategory.name}`
			)
			continue
		}

		await prisma.productCategory.create({
			data: {
				name: subsubcategory.name,
				parentId,
				sortOrder: index
			}
		})
	}
}

async function down() {
	await prisma.user.deleteMany()
	await prisma.productCategory.deleteMany()
}

main()
	.then(async () => {
		await prisma.$disconnect()
	})
	.catch(async (error) => {
		console.error(error)
		await prisma.$disconnect()
		process.exit(1)
	})
