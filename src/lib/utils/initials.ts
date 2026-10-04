/** Inisial maksimal 2 huruf dari nama tampilan (mis. "Rina Pratiwi" → "RP"). */
export function initialsOf(displayName: string): string {
	return displayName
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((word) => word[0]?.toUpperCase() ?? '')
		.join('');
}
