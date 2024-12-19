import {
	Controller,
	Get,
	Post,
	Patch,
	Delete,
	Body,
	Param,
	Query
} from '@nestjs/common'

import { UserService } from './user.service'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { Auth } from 'src/auth/auth.decorator'
import { User } from './user.decorator'

@Controller('user')
export class UserController {
	constructor(private readonly userService: UserService) {}

	@Post()
	create(@Body() dto: CreateUserDto) {
		return this.userService.create(dto)
	}

	@Get('me')
	@Auth()
	getProfile(@User('id') id: string) {
		return this.userService.getOne(id)
	}

	@Get(':id')
	getOne(@Param('id') id: string) {
		return this.userService.getOne(id)
	}

	@Get()
	getByEmail(@Query() dto: { email: string }) {
		return this.userService.getByEmail(dto.email)
	}

	@Patch('me')
	@Auth()
	update(@User('id') id: string, @Body() dto: UpdateUserDto) {
		return this.userService.update(id, dto)
	}

	@Delete('me')
	@Auth()
	remove(@User('id') id: string) {
		return this.userService.remove(id)
	}
}
