---
layout: "../../layouts/PostLayout.astro"
pageTitle: "aaronik | event sourcing"
title: "When Is It Right to Use Event Sourcing?"
slug: "01-when-event-sourcing"
imgSrc: "images/custom-event-sourcing.svg"
description: "The first article in a short series on Event Sourcing. When is it right, and when is it wrong, to use an Event Sourcing storage pattern, with examples in python"
date: "May 7 2025"
authors: ["Aaron Sullivan"]
draft: false
---

![Event Sourcing](/images/custom-event-sourcing.svg)

## Short Answer

Use event sourcing when any of the following apply:

1. **Your Domain Benefits from Auditability and History**

   If you need a complete, immutable audit trail of every change - for example, in financial systems, compliance-heavy domains, or regulated industries - event sourcing shines. Each event represents a domain fact that can be audited, making it easier to track down how and why your system reached its current state.

2. **You have Complex Business Logic and Domain Behaviors**

   When your domain involves complex business rules that change over time or require rollback capabilities, event sourcing helps. You can replay event streams to debug, troubleshoot, or regenerate the current state after code changes.

3. **You Need Temporal Queries and State Recreation**

   Event sourcing lets you query "what was the state at time T?" or "how did a particular change happen?" This capability is very hard to support in a traditional CRUD database schema.

4. **Integration via Event-Driven Architecture**

   Event sourcing naturally fits with event-driven architectures, where different subsystems react asynchronously to events. If your system is made of multiple components that need to stay loosely coupled and react independently to changes, event sourcing gives you a clean foundation.

5. **You Can Handle Increased Complexity in Infrastructure**

   Event sourcing requires managing event storage, snapshots (for performance in rebuilding state), event versioning, and eventual consistency issues. If your team and infrastructure are ready for this complexity, event sourcing can pay off. If not, the operational overhead might outweigh the benefits.

---

## What is Event Sourcing?

Event Sourcing is a data storage pattern. **Instead of storing only the current state, it records every individual change as an event.** These events, when combined, represent the current state. The current state can be reconstructed by processing all recorded events.

At its core, event sourcing is about modeling your data as a series of "things that happened" rather than just storing the current state. As one of our engineering leads puts it,

> "An event is simply something that happened." -- Kurtis

These events are typically immutable and stored in an append-only log, allowing you to reconstruct the complete history of your system by replaying events in sequence.

For example, in a banking application:

- You deposit $50 - That's an event
- You withdraw $20 - That's another event
- You use your debit card for $5 - That's a third event

Your current balance ($25) is derived from all these events. Instead of just updating a "balance" field, you're storing the complete transaction history that led to that state.

This approach allows you to reconstruct history, audit changes, and build new features like temporal queries or event-driven integrations.

### Core Components

Event sourcing consists of several core components that together form the full architecture pattern:

1. **Application Write Interface (Command Side)**
   - This is how your application accepts commands that intend to change state.
   - Commands are validated and converted into events.

2. **Event Store (Database)**
   - The authoritative storage for all events.
   - Events are persisted immutably in an append-only log.
   - Acts as the source of truth for the system state.

3. **Projector (Event Handler, Aggregator, or Read Model Builder)**
   - Is given event streams from the event store
   - Transforms event streams into Aggregates
   - This is what computes the current state from the event streams

4. **Aggregate (Domain Entity)**
   - The actual, computed state of your system.
   - The aggregate state is reconstructed by replaying events.

5. **Application Read Interface (Query Side)**
   - Provides the means to query the current state from read models built by projectors.

---

## Key Differences b/t Event Sourcing and Traditional Storage

| Aspect                 | Traditional State Storage     | Event Sourcing                    |
|------------------------|-------------------------------|---------------------------------|
| **What's stored**      | Current state only             | Complete history of events       |
| **State mutations**    | Direct, overwrites previous state | Append-only events that build state |
| **History**            | Lost unless explicitly tracked | Inherently preserved             |
| **Temporal queries**   | Generally not possible          | Natural capability               |
| **Debugging**          | Current state only              | Can replay to see how state evolved |
| **Storage requirements** | Generally lower               | Higher (stores all events and any snapshots) |
| **Complexity**         | Simpler to implement           | More complex infrastructure      |

### When the Traditional Approach Works Well

The traditional state-based approach works well when:

1. **Current state is all that matters** - You don't need historical data or audit trails.
2. **Simple domain** - Business rules are straightforward and unlikely to change.
3. **Resource constraints** - You have limited storage or processing power.
4. **Team familiarity** - Your team is more experienced with traditional CRUD patterns.

### When Event Sourcing Shines

Event sourcing becomes advantageous when:

1. **History and auditability matter** - Complete history provides value (financial, regulatory, etc.)
2. **Complex business rules** - Rules evolve over time and need to be applied retroactively.
3. **Temporal queries needed** - "What was the state at time X?" is a requirement.
4. **Integration requirements** - Events can be published to other systems for downstream processing.
5. **Debugging complexity** - Being able to replay events helps troubleshoot issues.

## What isn't Event Sourcing

It's important to understand what event sourcing is not, to avoid common misconceptions.

### Event Sourcing vs. CQRS

**Command Query Responsibility Segregation (CQRS)** is often confused with event sourcing, but they're distinct patterns:

- **CQRS** separates the components that handle write operations (commands) from those that handle read operations (queries). This creates two distinct data models: one optimized for writes and another for reads.
- **Event Sourcing** is about storing state changes as a sequence of events, rather than just the current state.

While they work well together (events from event sourcing can be used to build read models for CQRS), you can implement:

- CQRS without event sourcing (using traditional databases for both command and query sides)
- Event sourcing without CQRS (using the event log to rebuild state for both reads and writes)

### Event Sourcing vs. Pub/Sub

**Publish-Subscribe (Pub/Sub)** is another pattern that shouldn't be confused with event sourcing:

- **Pub/Sub** is a messaging pattern where publishers send messages to topics without knowledge of subscribers. Subscribers receive messages from topics they're interested in. The primary goal is decoupling communication between components.
- **Event Sourcing** uses events as the system of record. While events may be published to other systems, their primary purpose is to serve as the authoritative data store.

Key differences:

- In pub/sub, messages are typically transient and can be lost once processed
- In event sourcing, events are permanent and form the source of truth
- Pub/sub focuses on real-time communication; event sourcing focuses on state reconstruction
- You can use pub/sub to distribute events from an event-sourced system, but pub/sub alone doesn't constitute event sourcing

## Side-by-Side Comparison: Traditional State vs. Event Sourcing

Let's compare a traditional state-based approach with event sourcing to see the differences in how they handle the same domain concept - a simple bank account.

### Traditional State Storage Approach

Here's how we might implement a bank account using a traditional state-based approach:

```py
class TraditionalAccount:
    def __init__(self, name: str):
        self.name = name
        self.balance = 0
        # We only store the current state

    def deposit(self, amount: int):
        # Directly mutate the current state
        self.balance += amount

    def withdraw(self, amount: int):
        if amount > self.balance:
            raise ValueError("Insufficient funds")
        # Directly mutate the current state
        self.balance -= amount

    # Only the current balance is accessible
    def get_balance(self):
        return self.balance

# Usage example
if __name__ == "__main__":
    account = TraditionalAccount(name="Alice")
    account.deposit(100)  # Balance is now 100
    account.withdraw(30)  # Balance is now 70
    print(f"Account balance: {account.get_balance()}")  # Output: 70

    # But we can't answer questions like:
    # - How many transactions have occurred?
    # - What was the balance at a specific point in time?
    # - Who made each transaction and when?
```

In this traditional approach, we store and update only the current state. Each operation directly mutates that state, and we have no built-in history of how we arrived at the current balance.

### Event Sourcing Approach with the [`eventsourcing`](https://pypi.org/project/eventsourcing/) Library

Now, here's the same domain implemented using event sourcing:

```py
from eventsourcing.domain import Aggregate, event

class EventSourcedAccount(Aggregate):
    def __init__(self, name: str):
        self.name = name
        self.balance = 0
        # Internal state is built from events

    @event("Deposited")
    def deposit(self, amount: int):
        # Method creates an event and updates state
        self.balance += amount

    @event("Withdrawn")
    def withdraw(self, amount: int):
        if amount > self.balance:
            raise ValueError("Insufficient funds")
        # Method creates an event and updates state
        self.balance -= amount

    # The current state is derived from the event history

# Usage example
if __name__ == "__main__":
    account = EventSourcedAccount(name="Alice")
    account.deposit(100)  # Creates a "Deposited" event
    account.withdraw(30)  # Creates a "Withdrawn" event
    print(f"Account balance after events: {account.balance}")  # Output: 70

    # With event sourcing, we could:
    # - Replay events to audit the full history
    # - Calculate the balance at any point in time
    # - Add metadata to each event (who, when, why)
```

Every state-changing method is decorated with `@event`, which means the state transitions are recorded as events. The library can replay these events to rebuild the aggregate state at any time.

## Evolving Requirements Example

Let's see how these approaches handle evolving requirements - a common scenario in software development. Imagine a new business requirement: "We need to track the transaction date and description for each deposit and withdrawal."

### Traditional Approach - Adding a Transaction History

```py
from datetime import datetime

class EnhancedTraditionalAccount:
    def __init__(self, name: str):
        self.name = name
        self.balance = 0
        # Need to add a new data structure to track history
        self.transactions = []  # This is new!

    def deposit(self, amount: int, description: str = ""):
        self.balance += amount
        # Need to explicitly track transaction history
        self.transactions.append({
            "type": "deposit",
            "amount": amount,
            "description": description,
            "date": datetime.now(),
            "balance_after": self.balance
        })

    def withdraw(self, amount: int, description: str = ""):
        if amount > self.balance:
            raise ValueError("Insufficient funds")
        self.balance -= amount
        # Need to explicitly track transaction history
        self.transactions.append({
            "type": "withdrawal",
            "amount": amount,
            "description": description,
            "date": datetime.now(),
            "balance_after": self.balance
        })

    def get_transaction_history(self):
        return self.transactions
```

<figure>
    <strong>With the traditional approach, we had to:</strong>
    <ol>
        <li>Add a completely new data structure</li>
        <li>Update every state-changing method to record history</li>
        <li>Create a new method to access the transaction history</li>
    </ol>
</figure>

### Event Sourcing Approach - Adding a Transaction History

```py
from eventsourcing.domain import Aggregate, event
from datetime import datetime

class EnhancedEventSourcedAccount(Aggregate):
    def __init__(self, name: str):
        self.name = name
        self.balance = 0
        # No need for additional state structure!

    @event("Deposited")
    def deposit(self, amount: int, description: str = "", timestamp=None):
        # Just add the new parameters to the event
        self.balance += amount
        # timestamp and description are automatically captured in the event

    @event("Withdrawn")
    def withdraw(self, amount: int, description: str = "", timestamp=None):
        if amount > self.balance:
            raise ValueError("Insufficient funds")
        self.balance -= amount
        # timestamp and description are automatically captured in the event

    # To get transaction history, we can simply replay and filter events
    # The framework handles this for us!
```

<figure>
    <strong>With event sourcing:</strong>
    <ol>
        <li>We simply added new parameters to our events</li>
        <li>No need for new data structures or methods to track history</li>
        <li>History was already being captured automatically</li>
        <li>However, we may need to handle existing events through upcasting</li>
    </ol>
</figure>

## Upcasting

This example highlights an important point about event sourcing: when you add new fields to events, you need to handle existing events through a process called **upcasting**.

Since existing "Deposited" and "Withdrawn" events in our store don't have the `description` field, we'd need to define an upcaster that transforms older event versions to the newer schema:

```py
def upcast_deposit_event(old_event):
    # Transform old event data to new format
    if "description" not in old_event:
        old_event["description"] = ""  # Add default value
    if "timestamp" not in old_event:
        old_event["timestamp"] = old_event.get("created_at", None)  # Use creation time
    return old_event
```

This upcasting step is usually necessary whenever you evolve your event schema, although in our case it isn't necessary because all of our event parameters have default values.

While upcasting adds some complexity, it allows you to maintain all your historical data while still evolving your domain model - a key benefit of event sourcing that traditional approaches can't match.

I have [a deep dive on upcasting](/post/05-upcasting-deep-dive) - read this to go into more detail about this aspect of event sourcing.

## Common Pitfalls and How to Avoid Them

Based on my team's experience with event sourcing, here are some pitfalls we've fallen into, and how to potentially avoid them:

### Inappropriate Domain Modeling

   **Problem:** One of the biggest challenges with event sourcing is transitioning from the traditional way of thinking about data (tables, fields, current state) to modeling processes as events. It's easy to make mistakes when you're first getting started:

   > "Modeling your process and system as events is not something people are used to. And it's fundamental. If you don't know what your events are or how to model them, you're going to run into a lot of problems." -- Kurtis

   **Solution:** Before writing any code, invest time in brainstorming sessions with your team and business stakeholders. Event storming is a workshop-based approach where you map out the domain events on a whiteboard to understand the flow of events in your system. This helps everyone think in terms of "what happens" rather than "what state do we store."

### Complex Event Schemas and Upcasting Challenges

   **Problem:** When you include too much information or entire domain models in your events, you'll face painful upcasting issues whenever those models change:

   > "We put a bunch of our domain models in the events. And that ended up burning us big time down the road. We had to upcast every time we changed one of these different models, which happened all the time." -- Sully

   **Solution:** Keep events minimal, containing only the essential data needed to represent what happened. Define your upcasting pattern early in the project to handle schema evolution gracefully. Events should be treated as immutable facts about what happened, not as carriers for complex domain objects.

### Tooling and Infrastructure Maturity

   **Problem:** The tooling ecosystem for event sourcing isn't as mature as traditional CRUD systems in some languages and frameworks:

   > "If you're going to use event sourcing, investing in a tool or technology ecosystem that's really strong, really experienced in it, and can help you shortcut a lot of the implementation, could help you." -- Ted

   **Solution:** Carefully evaluate the available libraries and tools for your specific technology stack. Don't reinvent the wheel if good options exist, but be prepared to invest time in understanding their limitations and best practices.

### Knowledge Gap and Learning Curve

   **Problem:** For teams unfamiliar with event sourcing, there's a significant learning curve:

   > "For people who've not ever done it, it takes time to teach them to do it. If they've never experienced anything like it before, it can be quite a mental leap." -- Ted

   **Solution:** Invest in upfront learning and knowledge sharing. Have your team spend time studying event sourcing patterns, watching presentations, and reading articles before making key design decisions. This initial investment pays off by preventing costly mistakes later.


## Summary

- Use event sourcing when auditability, traceability, and temporal state recreation are critical.
- Complex domains with evolving business rules benefit from it.
- It's a natural fit for event-driven architectures.
- Be prepared for operational complexity including event versioning and snapshotting.
- Invest time in event storming and proper domain modeling before implementation.
- Keep events small and discrete to avoid painful upcasting issues.
- For teams new to event sourcing, invest in upfront learning to avoid costly mistakes.
- If your use case is simple or your team unfamiliar with event-driven patterns, consider starting with simpler persistence models.

By carefully considering your domain needs and operational constraints, you can decide if event sourcing is the right architectural pattern for your project.
