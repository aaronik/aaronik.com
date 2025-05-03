---
layout: "../../layouts/PostLayout.astro"
pageTitle: "aaronik | event sourcing"
title: "Using an Upcast Pattern with a Normal Database"
slug: "03-upcasting-normal-db"
imgSrc: "images/py-event-sourcing.jpg"
description: "The benefits of upcasting, even with a non event sourced database"
date: "May 2 2025"
---

Event sourcing frameworks often rely on *upcasting* to handle the evolution of event schemas over time. Upcasting allows you to transform older versions of events into the latest format, enabling your application to work consistently with a single, up-to-date event structure without breaking when older events exist in the store. While this pattern originated within event sourcing contexts, the core idea can be adapted and applied to traditional databases as well.

![Python Event Sourcing Library Diagram](/images/py-event-sourcing.jpg)

## What is Upcasting?

When your application evolves, your data schema changes. In an event-sourced system, you might have stored events created by older versions of your
application that use outdated fields or formats. Instead of migrating the entire event store upfront, upcasting allows you to convert those older events
on-the-fly as they are read, bringing them to the current version expected by your code.

This means your code always works with the latest version of the event model, while the underlying persisted data can remain in its original form.
Upcasting acts as a compatibility layer that upgrades data dynamically.

## Decoupling Migrations from Deployments

Applying this pattern in a traditional database context can bring several operational benefits. Typically, when migrating databases in a monolithic way,
you must coordinate schema migrations with code deployments to avoid downtime or inconsistencies. This usually means deploying database changes first,
waiting for migration completion, then deploying code that assumes the new schema.

By leveraging an upcast-style approach, you can decouple database migrations from application deployments:

- **Zero Downtime Deployments:** Because data upgrades happen dynamically at read-time, you can deploy new code that expects the latest schema
  even if the underlying data hasn’t been fully migrated yet.
- **Incremental Migrations:** Data changes can be incrementally backfilled or kept old until gradually phased out.
- **Reduced Risk:** Rolling back is simpler if you haven't applied irreversible schema changes upfront.

## Implementing Upcasting with Python Event Sourcing Library

The `eventsourcing` Python library provides a powerful way to apply upcasting within event sourcing. Let’s look at an example of defining and
applying an upcast to an event class.

```python
from eventsourcing.domain import Aggregate, event
from eventsourcing.persistence import Transcoding, StoredEvent

class UserAggregate(Aggregate):
    @event("UserCreated")
    def __init__(self, name: str, email: str):
        self.name = name
        self.email = email

# Version 1 of event: 'UserCreated' had 'name' and 'email'

# Imagine we added 'phone_number' in version 2:

class UserCreatedV2(Transcoding):
    def __init__(self, name: str, email: str, phone_number: str = None):
        self.name = name
        self.email = email
        self.phone_number = phone_number or ""

# Define an upcaster function that converts V1 events to V2

def user_created_upcaster(event: StoredEvent) -> StoredEvent:
    data = event.state
    if 'phone_number' not in data:
        data['phone_number'] = ""
    return StoredEvent(
        originator_id = event.originator_id,
        originator_version = event.originator_version,
        topic = event.topic,
        state = data,
        timestamp = event.timestamp,
    )

# Register upcaster with the event store (pseudocode depending on store)

event_store = ...  # your event store setup

event_store.upcasters['UserCreated'] = user_created_upcaster

# Now, whenever you load events, older UserCreated events without phone_number are automatically upcasted.
```

## Applying the Same Idea to a Normal Database

In a traditional relational database, you can adopt a similar idea by keeping your database schema flexible enough to store multiple versions of a record or include nullable/optional fields, and then applying transformations at the repository or service layer:

- Load data in its existing state from the database.
- Transform or “upcast” it into the latest domain model before passing to your application code.
- Write changes back in the new format.

This approach allows your application to handle data schema evolution without immediate, large migrations.

## Summary

Using the upcasting pattern from event sourcing in traditional database applications lets you:

- Decouple migrations from code deployments.
- Perform zero downtime deployments with a single database.
- Maintain backward compatibility with existing data.
- Incrementally migrate or backfill data as appropriate.

The Python `eventsourcing` library provides clear primitives for defining upcasters in event-sourced systems, which serve as a blueprint for adopting
similar strategies even outside strict event sourcing contexts.
