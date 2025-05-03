import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// See also PostLayout.astro
const blog = defineCollection({
    loader: glob({ pattern: "**/*.md", base: "./src/pages/post" }),
    schema: z.object({
        title: z.string(),
        pageTitle: z.string(),
        href: z.string(),
        imgSrc: z.string(),
        description: z.string()
    })
});

export const collections = { blog };
