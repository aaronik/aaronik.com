import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// See also PostLayout.astro
const blog = defineCollection({
    loader: glob({ pattern: "**/*.md", base: "./src/content/post" }),
    schema: z.object({
        title: z.string(),
        pageTitle: z.string(),
        slug: z.string(), // TODO I shouldn't need this, filename is same
        draft: z.boolean(),
        imgSrc: z.string(),
        description: z.string(),
        date: z.string(),
        authors: z.array(z.string())
    })
});

export const collections = { blog };
