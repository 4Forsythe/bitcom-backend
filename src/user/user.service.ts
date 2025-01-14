import {
	BadRequestException,
	ConflictException,
	Injectable,
	NotFoundException
} from '@nestjs/common'

import { hash } from 'argon2'
import { addMinutes } from 'date-fns'

import { PrismaService } from 'src/prisma.service'
import type { CreateUserDto } from './dto/create-user.dto'
import type { UpdateUserDto } from './dto/update-user.dto'

@Injectable()
export class UserService {
	constructor(private prisma: PrismaService) {}

	async generateCode(userId: string) {
		const code = Math.floor(100000 + Math.random() * 900000)

		await this.prisma.userCode.upsert({
			where: { userId },
			create: {
				code: String(code),
				userId,
				expiresAt: addMinutes(new Date(), 60)
			},
			update: {
				code: String(code),
				userId,
				expiresAt: addMinutes(new Date(), 60)
			}
		})

		return code
	}

	async create(dto: CreateUserDto) {
		const user = await this.prisma.user.findUnique({
			where: { email: dto.email }
		})

		if (user) throw new BadRequestException('Такой пользователь уже существует')

		const data = {
			name: dto.name,
			email: dto.email,
			phone: dto.phone,
			password: await hash(dto.password)
		}

		const { password, ...response } = await this.prisma.user.create({ data })

		return response
	}

	async getAll() {
		return this.prisma.user.findMany()
	}

	async getProfile(id: string) {
		const user = await this.prisma.user.findUnique({
			where: { id }
		})

		if (!user) return null

		const { password, ...response } = user

		return response
	}

	async getOne(id: string) {
		const user = await this.prisma.user.findUnique({
			where: { id }
		})

		if (!user) throw new NotFoundException('Пользователь не найден')

		const { password, ...response } = user

		return response
	}

	async getByEmail(email: string) {
		const user = await this.prisma.user.findUnique({
			where: { email }
		})

		if (!user) throw new NotFoundException('Пользователь не найден')

		const { password, ...response } = user

		return response
	}

	async update(id: string, dto: UpdateUserDto) {
		const user = await this.getOne(id)

		if (!user) throw new NotFoundException('Пользователь не найден')

		if (dto.phone) {
			const user = await this.prisma.user.findFirst({
				where: { phone: dto.phone, NOT: { id } }
			})

			if (user) throw new ConflictException('Указанный номер телефона занят')
		}

		const data = {
			name: dto.name,
			email: dto.email,
			phone: dto.phone,
			password: dto.password
		}

		if (dto.password) {
			data.password = await hash(dto.password)
		}

		const { password, ...response } = await this.prisma.user.update({
			where: { id },
			data
		})

		return response
	}

	async remove(id: string) {
		const user = await this.prisma.user.findUnique({
			where: { id }
		})

		if (!user) throw new NotFoundException('Пользователь не найден')

		return this.prisma.user.delete({
			where: { id }
		})
	}
}
