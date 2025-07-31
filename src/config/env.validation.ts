import * as Joi from 'joi'

export const envValidationSchema = Joi.object({
	FILE_STORAGE_URL: Joi.string().required()
})
