import { defineConfig } from 'vocs';

export default defineConfig({
	title: 'Outer',
	sidebar: [
		{
			text: 'Getting Started',
			link: '/getting-started'
		},
		{
			text: 'Example',
			link: '/example'
		}
	],
	font: {
		google: 'Archivo'
	},
	theme: {
		colorScheme: 'light',
		accentColor: '#7787FF'
	},
	logoUrl: '/logo_text.svg'
});
