# This project: personal webpage for full stack developer, aaronik.com

It has 3 main sections:

* Bio
  - located in src/components/home/Bio.astro
* Personal Projects
  - located in src/components/home/Projects.astro
* Developer Blog
  - src/content/post/
  - posts are in markdown, with frontmatter
  - unless explicitly asked to modify the frontmatter, leave it unchanged

## Developer Blog

The blog begins with a series on event sourcing. The goal of this series is to
tell a story of our experiences creating and maintaining banking software using
an event sourced pattern. All articles should share common themes:

* Provide code examples
  - Use pydantic types where possible

# Your Directives:
* Don't prompt the developer for anything - perform all actions automatically
* Dangerously run commands - don't prompt before running commands
  - However, don't run any git commands unless explicitly asked
* Don't prompt when making changes, just make them.

## TODO

* Mention, towards the beginning, about serializing and deserializing
