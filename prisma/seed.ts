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
