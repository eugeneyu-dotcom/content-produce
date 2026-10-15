// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig, fontProviders } from 'astro/config';
import fs from 'node:fs';

// Pages whose frontmatter has `noindex: true` are kept out of the sitemap.
const noindexSlugs = fs
	.readdirSync('./src/content/blog')
	.filter((f) => f.endsWith('.md'))
	.filter((f) => /^noindex:\s*true\s*$/m.test(fs.readFileSync('./src/content/blog/' + f, 'utf8').split('---')[1] || ''))
	.map((f) => f.replace(/\.md$/, ''));

// https://astro.build/config
export default defineConfig({
	site: 'https://www.encyclopedia-of-dreams.com',
	integrations: [mdx(), sitemap({ filter: (page) => !noindexSlugs.some((s) => page.includes('/blog/' + s + '/')) })],
	fonts: [
		{
			provider: fontProviders.local(),
			name: 'Atkinson',
			cssVariable: '--font-atkinson',
			fallbacks: ['sans-serif'],
			options: {
				variants: [
					{
						src: ['./src/assets/fonts/atkinson-regular.woff'],
						weight: 400,
						style: 'normal',
						display: 'swap',
					},
					{
						src: ['./src/assets/fonts/atkinson-bold.woff'],
						weight: 700,
						style: 'normal',
						display: 'swap',
					},
				],
			},
		},
	],
});
