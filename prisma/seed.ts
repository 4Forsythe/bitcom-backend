import { PrismaClient } from '@prisma/client'

import { hash } from 'argon2'
import { faker } from '@faker-js/faker'

const prisma = new PrismaClient()

async function main() {
	try {
		await down()
		await up()
	} catch (error) {
		console.error(error)
	}
}

async function up() {
	await prisma.user.create({
		data: {
			name: 'TestUser',
			email: 'test@mail.com',
			password: await hash('12345'),
			role: true,
			isActive: true
		}
	})

	await prisma.product.createMany({
		data: Array.from({ length: 20 }, () => ({
			name: faker.commerce.productName(),
			count: faker.number.int({ min: 0, max: 50 }),
			price: Number(faker.commerce.price()).toFixed(2),
			barcode: [faker.string.nanoid(9)],
			model: faker.commerce.product()
			// imageUrl: faker.image.url(),
			// categoryId: `00${faker.number.int}`,
			// brandId: `00000000${faker.number.int({ min: 1, max: 9 })}`,
			// deviceId: `00000000${faker.number.int({ min: 1, max: 9 })}`
		}))
	})

	const categories = await prisma.productCategory.findMany({
		select: {
			id: true
		}
	})

	const updates = categories.map((category) =>
		prisma.productCategory.update({
			where: { id: category.id },
			data: {
				imageUrl: `/product-categories/images/${category.id}.jpg`
			}
		})
	)

	await Promise.all(updates)
}

async function down() {
	await prisma.user.deleteMany()
	await prisma.product.deleteMany()
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
