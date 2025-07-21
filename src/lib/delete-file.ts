import * as fs from 'fs'

export const deleteFile = async (filePath: string) => {
	try {
		const existing = fs.readFileSync(filePath)

		if (existing) {
			await fs.promises.unlink(filePath)
			console.log(`File ${filePath} has been deleted`)
		}
	} catch (error) {
		if (error.code !== ' ENOENT') {
			console.error('Failed to delete file:', error)
			throw error
		}

		console.log(`File is not available: ${filePath}`)
	}
}
