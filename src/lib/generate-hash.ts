import { createHash } from 'crypto'

export const generateHash = (
	secret: string,
	algorithm: 'md5' | 'sha1' | 'sha256'
): string => {
	return createHash(algorithm).update(secret).digest('hex')
}
