import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import remarkMermaid from 'remark-mermaidjs';

// https://astro.build/config
export default defineConfig({
    vite: {
        plugins: [tailwindcss()]
    },
    integrations: [react()],
    adapter: netlify(),
    // TODO It's probably either this or CNAME
    site: 'https://blog.aaronik.com',
    // markdown: {
    //     remarkPlugins: [remarkMermaid],
    // },
});
