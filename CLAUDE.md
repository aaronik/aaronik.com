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

* Be concise
    - These articles should convey lots of information, with minimal fluff.
    - Focus on code examples and brief explanations.
    - Distribute explanation into comments within code blocks as well.
* Never remove the user's humor
    - The user has bits of dry humor all around, please don't remove them.
* Provide code examples
    - Use pydantic types where possible

## TODO

* Mention, towards the beginning, about serializing and deserializing
