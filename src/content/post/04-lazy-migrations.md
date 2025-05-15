---
layout: "../../layouts/PostLayout.astro"
pageTitle: "aaronik | lazy migrations"
title: "Lazy Migrations - Never Migrate your Deebs Again"
slug: "04-lazy-migrations"
imgSrc: "images/noise.png"
description: "Lazy or Incremental Migration - What, Why, How, What, And Why"
date: "May 14 2025"
authors: ["Aaron Sullivan"]
draft: true
---

## Lazy Migration

Lazy migration is the practice of transforming legacy data from the database at runtime. This is similar to [**upcasting**](/src/content/post/02-upcasting-deep-dive.md) from the [**event sourcing**](/src/content/post/01-when-event-sourcing.md) pattern.

## Why?

**Short answer**: It's easier, safer, and there's less application down time.

Migrations come with some headaches:

### Managing data consistency

### Application Downtime

### Backward Compatibility

## Incremental Migration

Incremental migration involves retrieving objects from the disk, transforming them on-the-fly to the desired version, serving them back to the user, and then writing the updated version back to disk for future reads. This cycle ensures that over time, all data converges to the latest format without the need for a comprehensive offline migration.

## Caching

To improve performance, caching strategies are vital in lazy migrations. Once data is migrated and transformed in memory, it should be cached to avoid repeated migrations on subsequent accesses. Caching reduces runtime overhead and improves user experience by serving up-to-date data efficiently.

<!--
Next steps could include code examples illustrating these concepts, comments explaining the reasoning, and references to serialization and deserialization.
-->

