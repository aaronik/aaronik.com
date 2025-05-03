---
layout: "../../layouts/PostLayout.astro"
pageTitle: "aaronik | event sourcing"
title: "When Is It Right to Use Event Sourcing?"
slug: "01-when-event-sourcing"
imgSrc: "images/event-sourcing.png"
description: "When is it right, and when is it wrong, to use an Event Sourcing data pattern, with examples in python"
date: "May 2 2025"
---

![Event Sourcing](/images/event-sourcing.png)

Event Sourcing is a powerful architectural pattern that can transform how you handle state and data in your applications. Instead of storing just the current state, event sourcing stores a sequence of immutable events that represent every state change. This allows you to reconstruct history, audit changes, and build new features like temporal queries or event-driven integrations.

But event sourcing is not a silver bullet. It comes with complexity and operational overhead. So, when is it the right choice?

## 1. Your Domain Benefits from Auditability and History

If you need a complete, immutable audit trail of every change - for example, in financial systems, compliance-heavy domains, or regulated industries - event sourcing shines. Each event represents a domain fact that can be audited, making it easier to track down how and why your system reached its current state.

## 2. Complex Business Logic and Domain Behaviors

When your domain involves complex business rules that change over time or require rollback capabilities, event sourcing helps. You can replay event streams to debug, troubleshoot, or regenerate the current state after code changes.

## 3. You Need Temporal Queries and State Recreation

Event sourcing lets you query "what was the state at time T?" or "how did a particular change happen?" This capability is very hard to support in a traditional CRUD database schema.

## 4. Integration via Event-Driven Architecture

Event sourcing naturally fits with event-driven architectures, where different subsystems react asynchronously to events. If your system is made of multiple components that need to stay loosely coupled and react independently to changes, event sourcing gives you a clean foundation.

## 5. You Can Handle Increased Complexity in Infrastructure

Event sourcing requires managing event storage, snapshots (for performance in rebuilding state), event versioning, and eventual consistency issues. If your team and infrastructure are ready for this complexity, event sourcing can pay off. If not, the operational overhead might outweigh the benefits.

## Example in Python with the [`eventsourcing`](https://pypi.org/project/eventsourcing/) Library

The [eventsourcing](https://github.com/johnbywater/eventsourcing) library is a popular Python library that helps you implement event sourcing without reinventing the wheel.

Here's a simple example defining an `Account` aggregate root where each event is stored and used to reconstruct the current balance:

```py
from eventsourcing.domain import Aggregate, event

class Account(Aggregate):
    def __init__(self, name: str):
        self.name = name
        self.balance = 0

    @event("Deposited")
    def deposit(self, amount: int):
        self.balance += amount

    @event("Withdrawn")
    def withdraw(self, amount: int):
        if amount > self.balance:
            raise ValueError("Insufficient funds")
        self.balance -= amount

# Usage example
if __name__ == "__main__":
    account = Account(name="Alice")
    account.deposit(100)
    account.withdraw(30)
    print(f"Account balance after events: " + account.balance)  # Output: 70
```

Every state-changing method is decorated with `@event`, which means the state transitions are recorded as events. The library can replay these events to rebuild the aggregate state at any time.

## Summary

- Use event sourcing when auditability, traceability, and temporal state recreation are critical.
- Complex domains with evolving business rules benefit from it.
- It's a natural fit for event-driven architectures.
- Be prepared for operational complexity including event versioning and snapshotting.
- If your use case is simple or your team unfamiliar with event-driven patterns, start with simpler persistence models.

By carefully considering your domain needs and operational constraints, you can decide if event sourcing is the right architectural pattern for your project.

