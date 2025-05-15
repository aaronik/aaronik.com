---
layout: "../../layouts/PostLayout.astro"
pageTitle: "aaronik | upcasting"
title: "Event Sourcing: What is Upcasting? A Deep Dive"
slug: "02-upcasting-deep-dive"
imgSrc: "images/custom-event-sourcing.svg"
description: "Another article in the series on Event Sourcing: An in depth look at upcasting"
date: "May 8 2025"
authors: ["Aaron Sullivan"]
draft: false
---

When building event sourced systems, your event definitions will naturally evolve as requirements change. Upcasting is the technique you use to turn the original events into the updated versions without mutating the data on disk.

Here's an example of a simple bank account event representing a state change, and how upcasting helps manage its evolution as requirements change.

## An Example From The Bank

### Stage 1: Initial Implementation

Initially, our bank account event represents a state change of crediting an amount:

```python
from pydantic import BaseModel

# An event, representing a change in the state, rather than the state itself
class AccountCredited(BaseModel):
    account_id: str
    amount: float
```

Imagine a controller received some json. Instead of computing the new state and saving that, we save the json itself. This is an event. At read time the app will run through every event to construct the state.

### Stage 2: New Requirements Emerge

Later, we need to support multiple currencies. So we add a `currency` field.

```python
class AccountCredited(BaseModel):
    account_id: str
    amount: float
    currency: str # <-- new
```

But old events in the event store don't have this currency field. So if we try to
instantiate an AccountCreditedV2 from the event stored in the database, which doesn't
have a `currency` field, our code will error out. The code has diverged from the data
in the database. Normally we'd run a migration, but one of the best parts of event sourcing
is its immutable event streams.

### Stage 3: Introducing Upcasting

To handle old events without currency info, we write an upcaster that transforms `AccountCredited` events to `AccountCreditedV2` events by providing a default currency.

```python
# Original event
class AccountCredited(BaseModel):
    account_id: str
    amount: float

# Version with new requirements
class AccountCreditedV2(BaseModel):
    account_id: str
    amount: float
    currency: Currency

# Upcast methods like this are registered with the projector.
# As it goes event by event through the event stream
# to create the aggregate, it encounters events new and old.
# When it encounters an old event, it identifies which upcast functions it
# needs to use to get the event from its old schema to its most modern one.
def account_credited_v1_to_v2(event: AccountCredited) -> AccountCreditedV2:
    return AccountCreditedV2(
        account_id=event.account_id,
        amount=event.amount,
        # Default the currency since old events didn't have it
        currency=Currency.USD
    )
```

This is how the system can work with a database that has old and new events saved together,
and that's how the event stream can be immutable.

### Stage 4: Further Evolution - AccountCreditedV3

The requirements grow again. Now we want to add a `transaction_notes` field to capture any remarks about the credit event.

```python
class AccountCreditedV3(BaseModel):
    account_id: str
    amount: float
    currency: Currency
    transaction_notes: str # <-- another new field
```

We need another upcaster to handle old versions (AccountCredited and AccountCreditedV2) and bring them up to AccountCreditedV3.

```python
# Again note the function signature
def account_credited_v2_to_v3(event: AccountCreditedV2) -> AccountCreditedV3:
    return AccountCreditedV3(
        account_id=event.account_id,
        amount=event.amount,
        currency=event.currency,
        transaction_notes=""  # <-- new, aggregates with only old events get empty notes
    )

# Note: The event sourcing library likely will compose the
# upcast_v1_to_v2 and upcast_v2_to_v3 functions automatically.
```

When all new events have upcasters registered, the library can manage finding paths from any old event to any new one, thus it can create the newest version of your Aggregate, in our case, AccountCreditedV3.

### Keeping a Unified Export for AccountCredited

As your event versions grow, it can become confusing to keep track of which version to use throughout your codebase. To simplify this, maintain a single export name `AccountCredited` that always points to the highest version of the event model in one central location.

For example, create a module like `events/account_credited.py`:

```python
# events/__init__.py

from .account_credited_v3 import AccountCreditedV3

# Alias AccountCredited to the most recent version
AccountCredited = AccountCreditedV3
```

Now, throughout your codebase, simply import `AccountCredited` from this module:

```python
from events import AccountCredited

# This will always be the latest version (AccountCreditedV3 currently)
```

This pattern helps maintain clean, scalable event schemas as your system evolves.

## What Not To Do

### Don't: Put Domain Models in Your Events

It's tempting to embed rich domain models directly inside your events. For example:

```python
from pydantic import BaseModel

class BankAccount(BaseModel):
    account_id: str
    balance: float
    owner_name: str
    opened_date: str

class BankAccountUpdated(BaseModel):
    bank_account: BankAccount # <-- Don't put your domain models anywhere in your events!
```

This event represents a change by embedding the entire BankAccount model instance.

However, this introduces tight coupling between your domain model and your event schema.

When you update the `BankAccount` model (e.g., add a new field `phone_number`), you must create a new upcast for `BankAccountUpdated` to handle migrating all stored events forward. For example:

```python
# New version of the domain model
class BankAccountV2(BaseModel):
    account_id: str
    balance: float
    owner_name: str
    opened_date: str
    phone_number: str  # <-- new field

# Now we need a new event version embedding the updated domain model
class BankAccountUpdatedV2(BaseModel):
    bank_account: BankAccountV2

# And a new upcasting function as well
def bank_account_updated_v1_to_v2(event: BankAccountUpdated) -> BankAccountUpdatedV2:
    return BankAccountUpdatedV2(
        bank_account=BankAccountV2(
            account_id=event.bank_account.account_id,
            balance=event.bank_account.balance,
            owner_name=event.bank_account.owner_name,
            opened_date=event.bank_account.opened_date,
            phone_number=""
        )
    )
```

This means you need a new event/upcast not only when you need to change the data in an event, but whenever you update your internal domain model as well.

Instead, keep events minimal and focused only on what changed:

```python
class BankAccountOwnerNameUpdated(BaseModel):
    account_id: str
    new_owner_name: str
```

This way, your events only describe the specific state changes without embedding the full domain model.

This decouples your API and domain model from the event stream format, making evolution easier by reducing the number of upcasters and old versioned events.

## Refactor with Confidence

A valuable practice to ensure reliability when refactoring or evolving your event-sourced system is to periodically extract a representative sample of event streams from your production database.

These extracted streams are then hardcoded as fixture files within your test suite.

By running your projector functions over these fixtures, you can guarantee that the event upcasting and state reconstruction logic continues to work correctly across event versions.

This approach allows you to catch any breaking changes early during development, giving you the confidence to refactor event models and upcasters safely.

### Example Process

1. Extract real event streams covering a variety of scenarios from your database.
2. Serialize and save these event streams as JSON or Python fixtures in your test directory.
3. Write tests that load these fixtures and run your projector(s) to build aggregates.
4. Assert the expected state or simply assert no exceptions occur.

This testing strategy leverages the immutable nature of event sourcing and helps ensure the robustness of your event evolution and upcasting strategies.

### Example Code

```python
import pytest
from events import AccountCredited

# Suppose this is your projector function that rehydrates an aggregate
# from a list of events.
def project_account(events):
    state = {"balance": 0, "currency": "USD", "notes": ""}
    for event_dict in events:
        # Here you would parse the event dict and apply upcasting as needed
        event = AccountCredited.parse_obj(event_dict)
        # Simplified projector logic for example
        if hasattr(event, "amount"):
            state["balance"] += event.amount
        if hasattr(event, "currency"):
            state["currency"] = event.currency
        if hasattr(event, "transaction_notes"):
            state["notes"] = event.transaction_notes
    return state

# Hardcoded fixture representing a sample event stream extracted from well used test env
sample_event_stream = [
    {"account_id": "123", "amount": 100.0},  # Old version event
    {"account_id": "123", "amount": 50.0, "currency": "USD"},  # V2
    {"account_id": "123", "amount": 25.0, "currency": "USD", "transaction_notes": "Deposit"}  # V3
]


def test_project_account():
    state = project_account(sample_event_stream)
    assert state["balance"] == 175.0
    assert state["currency"] == "USD"
    assert state["notes"] == "Deposit"
```

This example shows how you can hardcode a sample event stream covering multiple event versions and run your projector function on it as a test to catch any situations whereby someone might have forgotten to write an upcast for an event, being fooled into feeling safe because they aren't testing against old events in their shiny test database.

## Event Version Field on Events

One approach to help your projector correctly identify and handle different versions of events is to include an explicit version field in each event object.

### What It Looks Like

You declare a constant version attribute within each event version class, for example:

```python
from pydantic import BaseModel, Field

class AccountCreditedV1(BaseModel):
    version: int = Field(1, const=True)
    account_id: str
    amount: float

class AccountCreditedV2(BaseModel):
    version: int = Field(2, const=True)
    account_id: str
    amount: float
    currency: str

class AccountCreditedV3(BaseModel):
    version: int = Field(3, const=True)
    account_id: str
    amount: float
    currency: str
    transaction_notes: str
```

When serialized to JSON, these events carry their version number.

### Benefits

- **Simplifies projector logic:** The projector can easily inspect the version field to decide how to parse or upcast the event.
- **Self-describing events:** Each event carries its schema version explicitly, which aids debugging, monitoring, and auditing.
- **Explicitness in evolution:** It forces event authors to think about versioning and schema changes clearly.

### Drawbacks

- **Slightly more verbosity:** You add a version field to each event, increasing event data size minimally.
- **Schema coupling:** You must remember to bump the version field on every schema change, which adds developer overhead.
- **Possible duplication:** If you also rely on external metadata for event versions (e.g., stored in DB or event store), this might duplicate information.

### Recommendation

For new projects, especially those with complex event evolution or many event versions, including an explicit version field on your events is a good idea. It reduces ambiguity and makes your projector logic more robust.

For existing projects with stable or few event versions, introducing a version field partway through may add complexity and is usually not necessary.

