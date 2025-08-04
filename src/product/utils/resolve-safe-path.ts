import * as path from 'path'

export function resolveSafePath(directory: string, relative: string) {
	const fullPath = path.join(directory, relative)

	const normalized = path.normalize(fullPath)

	if (!normalized.startsWith(path.normalize(directory + path.sep))) {
		throw new Error('resolveSatePath: unsafe path detected')
	}

	return normalized
}
