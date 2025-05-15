---
layout: "../../layouts/PostLayout.astro"
pageTitle: "aaronik | upcasting a trad db"
title: "Read Time Upcasting - Never Migrate your Deebs Again"
slug: "04-read-time-upcasting"
imgSrc: "images/good-deebs.png"
description: "Read Time Upcasting - What, Why, How, What, And Why"
date: "May 14 2025"
authors: ["Aaron Sullivan"]
draft: false
---

**Read time upcasting** is the practice of transforming legacy data from the database at runtime. This is an expansion of [**upcasting**](/src/content/post/02-upcasting-deep-dive.md) from the [**event sourcing**](/src/content/post/01-when-event-sourcing.md) pattern, applied to non event sourced, traditional databases.

## Why?

**Short answer**: Data safety, application down time, and coordinated deploys.

Migrations come with headaches:

### Data Safety

Traditional batch migrations operate on large sets of data in one go, which creates a risk of partial migration if the process fails midway. This can lead to data inconsistency, leaving some records migrated and others not. Recovering from such a state often requires complex rollback or manual fix-up, increasing the chance of that one manual key stroke that brings down prod, and the late Friday night "pizza party" that ensues.

### Application Downtime

Batch migrations frequently require taking the application offline to avoid data corruption or inconsistent reads or writes while migrations run. This downtime can impact users and business operations, sometimes for extended periods during complex migrations.

### Coupled Migrations with Deploys

This is why migrations come with a `down` and an `up` - because sometimes deploys go wrong. Whoops, shipped a bug, and we need to roll back the deploy. Well, that means you need to un-migrate the database, which could cause data loss, and definitely causes headache - possibly with nausea as well.

## What's it look like?

### Traditional Batch Migration

Imagine a banking system needing to add a new boolean field `is_active` to an `Account` model to track whether accounts are active or delinquent.

```python
# App code
from pydantic import BaseModel

# Originally, our account looks like this:
class Account(BaseModel):
    account_id: str
    owner_name: str
    balance: float

# Some requirements change, and we need to mark delinquent accounts:
class Account(BaseModel):
    account_id: str
    owner_name: str
    balance: float
    is_active: bool # <-- new guy
```


```python
# Assuming our database looks something like this
accounts = [
    {"account_id": "abc123", "owner_name": "John Doe", "balance": 1000.0},
    {"account_id": "xyz789", "owner_name": "Jane Smith", "balance": 2500.0},
]
```

```python
# We'd need some kind of migration that looks like this
def up():
    for acc_data in db.get_accounts():
        acc_data["is_active"] = True
        db.save_account(acc_data)

def down():
    for acc_data in get_accounts():
        del acc_data["is_active"]
        db.save_account(acc_data)

# Now we have to coordinate running this migration with the deploy of the new app code
```

### Read Time Upcasting

Instead of migrating all accounts at once, upcasting transforms accounts on-the-fly at read time.

```python
from pydantic import BaseModel
from typing import Union

# Define both old and new schemas
class AccountV1(BaseModel):
    version: 1
    account_id: str
    owner_name: str
    balance: float

class AccountV2(BaseModel):
    version: 2
    account_id: str
    owner_name: str
    balance: float
    is_active: bool

# Define a transition from old to new
def account_v1_to_v2(account: AccountV1) -> AccountV2:
    acc = account.model_dump()
    acc["is_active"] = True
    return AccountV2(**acc)

# Now register this transition with a library which handles identifying old
# domain models and turning them into the new ones. This is inspired by the
# event sourcing upcasting pattern, and pypi's `eventsourcing` library does this.

# In Pseudo code:
# 1) Check what version is in the db
# 2) Find the path from that version to the newest within the registered transitions
# 3) Put the data through that path
# 4) Never migrate again
```

Now the old data in your database gets loaded into the new form. With this, you have no migrations, no coordinated deploys, and no downtime. The tradeoff is that you have to keep all versions of `Account` (although you never touch the old ones again, they're frozen in time), and the transitions between them.

---

## Common Pitfalls & How to Avoid Them

Working with read-time upcasting can be sweet, but watch out for these common traps:

- **Skipping version and transition discipline**: Without strict version tracking and well-registered transitions, your data migration will be a house of cards. Maintain discipline.

- **Over-engineering transitions**: Don’t make your transition functions do everything at once. Keep changes small and incremental.

- **Ignoring performance impact**: Every migration on read adds latency. Use caching wisely and measure your own tolerance.

- **Neglecting testing**: This can’t be stressed this enough. Untested migrations are an invitation for production surprise parties.

- **Forgetting rollback plans**: Even though upcasting avoids batch migration rollbacks, you might still need to handle corrupt or malformed data gracefully.

- **Leaving legacy code to rot**: Keep old versions around only as long as needed. Clean up after yourself.

Keep these pitfalls in mind and you’ll be able to stick to your pizza free diet.

---

## Caching

Caching is the secret sauce that makes read-time upcasting viable at scale. Since the primary drawback of transforming data on every read is the runtime cost, caching helps flatten that curve.

### Why Cache?

Every upcasted transformation on read is like a mini computation migraine. Without caching, your app repeats the same upgrade dance for that same record every time it’s accessed.

### What to Cache

- **In-memory Objects**: Cache the fully deserialized and migrated objects inside your app memory when practical.
- **Serialized Data**: Cache the migrated payloads in fast-access stores like Redis or Memcached to avoid repeated DB reads and transformations.

### Cache Invalidation

A strong cache is only as good as its invalidation strategy:

- Evict or refresh cache entries when underlying data changes
- Use TTL (time to live) judiciously based on data volatility
- For writes, update the cache immediately after the database save to keep syncing

### Pitfalls & Gotchas

- Stale caches can serve old data. Always balance between fresh and fast.
- Cache complexity can hide migration issues, so monitor cache hit/miss ratios closely.

---

## Alternatives

Let's talk about other ways to do this

### Traditional style

As outlined above, you can define migrations, then with those, operate all at once on your whole database. This might be fine for a small app, or for a large, legacy application, might be difficult.

**Pros**:
- Simple and well understood pattern
- Good tooling in many frameworks and databases
- Schema is consistent after migration completes

**Cons**:
- Risk of partial migration failures and inconsistent data
- Downtime or complex coordination needed during migration
- Rollbacks and downgrades are risky and complex

### Incremental Migration

Incremental migration, aka Lazy Migration, JIT Migration, or On-demand Migration, involves retrieving objects from disk and transforming them on-the-fly to the newest version, the same way as the read time upcasting we've been talking about. However in this pattern, after serving the data to the user, the updated version gets written back to disk. This cycle ensures that over time, all data converges to the latest format without the need for an offline migration.

**Pros**:
- No downtime, migrates gradually during normal use
- Less risk of migration failure causing data loss or downtime
- Data converges to latest format over time transparently

**Cons**:
- More complex code paths to handle multiple versions
- Slight runtime performance cost during migration on access
- Cache and consistency management adds complexity

### Shadow Copy Migration (Dual Write)

Shadow Copy Migration involves writing incoming writes to both the old and new schema in parallel, allowing you to backfill data gradually and switch reads over only when ready.

**Pros**:
- Allows gradual migration without downtime
- Enables rollback to old schema by continuing to read old data
- Decouples schema change from deployment

**Cons**:
- Complex write path logic with dual writes
- Increased write latency and storage usage
- Complex synchronization between old and new data formats

### Blue-Green Deployment with Migration

Blue-Green deployments create a parallel environment where the new schema and code run side-by-side, allowing you to switch traffic gradually once migration is complete.

**Pros**:
- No downtime during cutover
- Easy rollback by switching back to old environment
- Enables testing in production environment

**Cons**:
- Requires duplicate infrastructure costs
- Operational complexity managing parallel environments
- Migration still needs to complete before cutover

### Schema Versioning with Feature Flags

Deploy code supporting both old and new schemas behind feature flags that can be toggled to control rollout.

**Pros**:
- Granular control over schema change rollout
- Supports rollback by toggling flags
- Enables A/B testing and gradual feature rollout

**Cons**:
- Increased code complexity to support multiple versions
- Potential technical debt if old code paths linger
- Feature flag management overhead

### Event Versioning (Event Sourcing)

Explicitly version your events and apply transformations (upcasting) when projecting to newer formats or views.

**Pros**:
- Immutable event store makes migrations safe and transparent
- Enables flexible projections and multiple views
- Clear version history and audit trail

**Cons**:
- Complexity of managing event versioning and upcasters
- Steeper learning curve for event sourced systems
- Less suited for all types of databases or apps

Read more about [event sourcing](/src/content/post/01-when-event-sourcing.md).

