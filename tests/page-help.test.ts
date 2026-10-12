import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { translateList, translate, LOCALES } from '$lib/i18n';

/**
 * Contract test rule `.agents/rules/page-help-pattern.md`: setiap halaman yang merender `HeroBanner`
 * (langsung atau lewat `ModuleShell`) wajib mengisi prop `help` dengan kunci i18n panduan halaman yang
 * lengkap di semua locale.
 */

const SOURCE_DIR = 'src';
const HERO_TAG = /<(HeroBanner|ModuleShell)\b/g;
const HELP_ATTRIBUTE = /\shelp=("[^"]*"|\{[^}]*\})/;
const HELP_KEY = /help\.[a-z0-9_]+/g;
const HELP_PASSTHROUGH = /\{help\}|\shelp=\{help\}/;

/** Komponen pembungkus yang meneruskan prop `help` dari pemanggilnya (dicek di pemanggil). */
const HELP_WRAPPERS = new Set(['src/lib/features/school-admin/components/ModuleShell.svelte']);

/**
 * Kunci panduan pada prop `help`: literal `help="help.x"` atau ternary berisi literal
 * (`help={isParent ? 'help.a' : 'help.b'}`) untuk komponen yang dipakai lintas peran.
 */
function helpKeys(tag: string): string[] {
	const attribute = HELP_ATTRIBUTE.exec(tag)?.[1];
	return attribute ? (attribute.match(HELP_KEY) ?? []) : [];
}

interface HeroUsage {
	file: string;
	tag: string;
}

/** Tag pembuka sampai `>` penutupnya; `>` di dalam ekspresi `{...}` diabaikan. */
function openingTag(source: string, start: number): string {
	let depth = 0;
	for (let index = start; index < source.length; index++) {
		const char = source[index];
		if (char === '{') depth++;
		else if (char === '}') depth--;
		else if (char === '>' && depth === 0) return source.slice(start, index + 1);
	}
	return source.slice(start);
}

function collectHeroUsages(): HeroUsage[] {
	const files = readdirSync(SOURCE_DIR, { recursive: true, encoding: 'utf8' })
		.filter((path) => path.endsWith('.svelte'))
		.map((path) => join(SOURCE_DIR, path).split('\\').join('/'));

	return files.flatMap((file) => {
		const source = readFileSync(file, 'utf8');
		return [...source.matchAll(HERO_TAG)].map((match) => ({
			file,
			tag: openingTag(source, match.index)
		}));
	});
}

const usages = collectHeroUsages();
const requiredUsages = usages.filter(({ file }) => !HELP_WRAPPERS.has(file));

describe('page help (page-help-pattern)', () => {
	it('menemukan pemakaian HeroBanner', () => {
		expect(usages.length).toBeGreaterThan(0);
	});

	it('komponen pembungkus meneruskan prop help ke HeroBanner', () => {
		for (const { file, tag } of usages.filter(({ file }) => HELP_WRAPPERS.has(file))) {
			expect(tag, file).toMatch(HELP_PASSTHROUGH);
		}
	});

	it('setiap halaman mengisi help dengan kunci literal', () => {
		for (const { file, tag } of requiredUsages) {
			expect(helpKeys(tag).length, `${file} wajib punya help="help.<page>"`).toBeGreaterThan(0);
		}
	});

	it('kunci panduan lengkap di semua locale (purpose, features, steps)', () => {
		const topics = requiredUsages.flatMap(({ file, tag }) =>
			helpKeys(tag).map((topic) => ({ file, topic }))
		);
		for (const { file, topic } of topics) {
			for (const locale of LOCALES) {
				const context = `${file} · ${topic} · ${locale}`;
				expect(translate(locale, `${topic}.purpose`), context).not.toBe(`${topic}.purpose`);
				expect(translateList(locale, `${topic}.features`).length, context).toBeGreaterThan(0);
				expect(translateList(locale, `${topic}.steps`).length, context).toBeGreaterThan(0);
			}
		}
	});
});
