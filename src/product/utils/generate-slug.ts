import slugify from 'slugify'

export function generateSlug(text: string): string {
	const now = Date.now()
	const slug = slugify(text, { replacement: '_' }) + '_' + now

	return slug
}
