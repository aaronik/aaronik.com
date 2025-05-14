---
layout: "../../layouts/PostLayout.astro"
pageTitle: "aaronik | upcasting"
title: "What is Upcasting? A Deep Dive"
slug: "05-upcasting-deep-dive"
imgSrc: "images/custom-event-sourcing.svg"
description: "An in depth look at upcasting"
date: "May 8 2025"
authors: ["Aaron Sullivan"]
draft: false
---

When building event sourced systems, your event definitions will naturally evolve as requirements change. Upcasting is the technique you use to migrate old events into new versions without losing data or breaking the system.

Let's walk through how a simple bank account event representing a state change matures and how upcasting helps manage its evolution using Pydantic for strong typing in Python.

---

### Stage 1: Initial Implementation

Initially, our bank account event represents a state change of crediting an amount:

```python
from pydantic import BaseModel

# An event, representing a change in the state, not the state itself
class AccountCredited(BaseModel):
    account_id: str
    amount: float
```

Imagine a controller received some json. Instead of computing the new state and saving that, we save the json itself. This is an event. Later we'll run through every event and construct the state.

---

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

---

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

---

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

---

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

---

## What Not To Do

### Putting Domain Models in Your Events

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

# New event version embedding the updated domain model
class BankAccountUpdatedV2(BaseModel):
    bank_account: BankAccountV2

# Upcaster to migrate old events to new version

def bank_account_updated_v1_to_v2(event: BankAccountUpdated) -> BankAccountUpdatedV2:
    return BankAccountUpdatedV2(
        bank_account=BankAccountV2(
            account_id=event.bank_account.account_id,
            balance=event.bank_account.balance,
            owner_name=event.bank_account.owner_name,
            opened_date=event.bank_account.opened_date,
            phone_number=""  # default for old events that lack this field
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
