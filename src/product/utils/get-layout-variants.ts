export function getLayoutVariants(query: string): string[] {
	if (!query) return []

	const ruLayout = 'йцукенгшщзхъфывапролджэячсмитьбю.'
	const enLayout = "qwertyuiop[]asdfghjkl;'zxcvbnm,./"

	const variants = [query]
	let altQuery = ''

	for (let char of query.toLowerCase()) {
		const ruIndex = ruLayout.indexOf(char)
		const enIndex = enLayout.indexOf(char)
		if (ruIndex !== -1) {
			altQuery += enLayout[ruIndex]
		} else if (enIndex !== -1) {
			altQuery += ruLayout[enIndex]
		} else {
			altQuery += char
		}
	}

	if (altQuery !== query) {
		variants.push(altQuery)
	}

	return variants
}
