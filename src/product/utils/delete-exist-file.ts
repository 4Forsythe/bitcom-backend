import * as fs from 'fs'
import { resolveSafePath } from './resolve-safe-path'

export async function deleteExistFile(directory: string, relative: string) {
	try {
		const fullPath = resolveSafePath(directory, relative)
		await fs.promises.unlink(fullPath)
	} catch (error) {
		if (error.code === 'ENOENT') {
			console.warn('deleteExistFile: file to delete is not found')
			return
		}

		console.error(`deleteExistFile: failed to delete file ${relative}`, error)
	}
}
