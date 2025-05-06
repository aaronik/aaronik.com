# Aaronik's Personal Site

Built using Astro

## Building

A github runner automatically builds and releases what gets pushed to the main branch.
This is served via github pages.

## Astro Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run check`           | Check your project for type issues               |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## Notes
* Astro starter: https://github.com/hkbertoson/github-pages
* github pages serves using jekyll, even if the site isn't built in jekyll.
  Jekyll auto ignores any files or paths starting with an underscore, and astro
  builds into the _astro folder. So in `public/` there's a .nojekyll file. This file
  instructs github to skip jekyll when serving, which is required for all build files
  to be served.
* SVG Logo comes from https://text-to-svg.com/
