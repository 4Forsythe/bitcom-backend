import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'
import { AllExceptionsFilter } from './all-exceptions.filter'

import * as dotenv from 'dotenv'
import * as compression from 'compression'
import * as cookieParser from 'cookie-parser'

import helmet from 'helmet'

dotenv.config()

async function bootstrap() {
	const app = await NestFactory.create(AppModule)

	app.setGlobalPrefix(process.env.GLOBAL_PREFIX)
	app.useGlobalFilters(new AllExceptionsFilter())

	app.use(helmet())
	app.use(compression())
	app.use(cookieParser())

	app.enableCors({
		origin: [/^(.*)/],
		methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
		preflightContinue: false,
		optionsSuccessStatus: 200,
		credentials: true,
		allowedHeaders:
			'Origin,X-Requested-With,Content-Type,Accept,Authorization,authorization,X-Forwarded-for'
	})

	app.useGlobalPipes(new ValidationPipe())

	await app.listen(process.env.PORT)
}
bootstrap()
