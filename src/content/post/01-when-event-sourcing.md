---
layout: "../../layouts/PostLayout.astro"
pageTitle: "aaronik | event sourcing"
title: "Event Sourcing: When Is It Right to Use?"
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

5. **Your Team Can Adapt to New Patterns**

    Event sourcing is a less familiar pattern, and there are initial stumbling blocks that can be costly down the road. Be sure to follow best practices from the get-go. Somebody experienced in event sourcing architecture keeping track of the implementation is highly recommended.

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
   - Commands are validated, converted into events, and appended to the event stream.

2. **Event Store (Database)**
   - The authoritative storage for all events.
   - Events are persisted immutably in an append-only log.
   - Acts as the source of truth for the system state.

3. **Projector (Event Handler, Aggregator, etc.)**
   - Is given event streams from the event store
   - Transforms event streams into Aggregates
   - This is what computes the current state from the event streams

4. **Aggregate (Data View)**
   - A computed state of your model, derived by replaying events.
   - Aggregates are views into the true data: the event stream.
   - They are the projections of that stream into whatever data you need at the moment, be it:
       - three fields
       - the biggest model
       - some chunk of the data, how it was 7 months ago
       - how many times that field has been updated over the last 2 weeks

5. **Application Read Interface (Query Side)**
   - Provides the means to query the current state from read models built by projectors.

Other important pieces of the puzzle include:

* **Snapshotting**
    - Caching the projected aggregate so that the application doesn't need to compute it the next time it's read.
    - Caching always introduces some complexity, but the normal advantage is realized: Application speed improves.

* **Upcasting**
    - Since the event stream is immutable by design, old events need to still be recognized if they've been updated to a newer version. Upcasting is the process of converting old events to newer events at read time.

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
| **Complexity**         | Simpler mental model           | More complex mental model      |

### When the Traditional Approach Works Well

The traditional state-based approach works well when:

1. **Current state is all that matters** - You don't need historical data or audit trails.
2. **Simple domain** - Business rules are straightforward and unlikely to change.
3. **Resource constraints** - You have limited storage or processing power.
4. **Team familiarity** - Your team is unlikely to learn new patterns.

### When Event Sourcing Shines

Event sourcing becomes advantageous when:

1. **History and auditability matter** - Complete history provides value (financial, regulatory, etc.)
2. **Complex business rules** - Rules evolve over time and need to be applied retroactively.
3. **Temporal queries needed** - "What was the state at time X?" is a requirement.
4. **Integration requirements** - Events can be published to other systems for downstream processing.
5. **Debugging complexity** - Being able to replay events helps troubleshoot issues.
6. **Data Retention** - Data is valuable these days, the traditional approach effectively throws it away.

## What isn't Event Sourcing

It's important to understand what event sourcing is not, to avoid common misconceptions.

### Event Sourcing vs. CQRS

**Command Query Responsibility Segregation (CQRS)** is often confused with event sourcing, but they're distinct patterns:

- **CQRS** separates the components that handle write operations (commands) from those that handle read operations (queries). This creates two distinct data models: one optimized for writes and another for reads.
- **Event Sourcing** is about storing state changes as a sequence of events, rather than just the current state.

There's no problem implementing:

- CQRS without event sourcing (using traditional databases for both command and query sides)
- Event sourcing without CQRS (using the event log to rebuild state for both reads and writes)

However, CQRS pairs quite well with event sourcing, where commands and queries project whatever they need, and commands casually toss events into the stream.

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
    def __init__(self):
        self.name = ""
        self.balance = 0

    def deposit(self, amount: int):
        # Directly mutate the current state
        self.balance += amount

    def withdraw(self, amount: int):
        if amount > self.balance:
            raise ValueError("Insufficient funds")
        self.balance -= amount

    def update_name(self, name: str):
        self.name = name

account = TraditionalAccount()
account.update_name("Alice")
account.deposit(100)
account.withdraw(30)
account.save() # Write current state to the DB

# Now all the information we can get:
print(account.balance)  # 70
print(account.name)  # Alice

```

In this traditional approach, we store and update only the current state. Each operation directly mutates that state, and we have no built-in history of how we arrived at the current balance.

### Event Sourcing Approach

Now, here's the same domain implemented using event sourcing:

```py
from typing import Union
from pydantic import BaseModel

class Deposit(BaseModel):
    amount: int

class Withdraw(BaseModel):
    amount: int

class NameUpdate(BaseModel):
    name: str

# For ease of use
Event = Union[Deposit, NameUpdate, Withdraw]

event_stream: list[Event] = []
event_stream.append(NameUpdate(name="Alice"))
event_stream.append(Deposit(amount=100))
event_stream.append(Withdraw(amount=30))

# =============================================================#
# Now we construct a reader for whatever question we're asking #
# =============================================================#

# QUESTION: How many transactions were there?
num_transactions = sum(
    1
    for event in event_stream
    if isinstance(event, (Deposit, Withdraw))
)

print(num_transactions) # 2

# QUESTION: What was Alice's highest ever balance?
def project_max_balance(event_stream: list[Event]) -> int:
    balance = 0
    max_balance = 0

    for event in event_stream:
        if isinstance(event, Deposit):
            balance += event.amount
        elif isinstance(event, Withdraw):
            balance -= event.amount

        if balance > max_balance:
            max_balance = balance

    return max_balance

print(project_max_balance(event_stream)) # 100

# QUESTION: What is the account object as if we had a traditional
# storage mechanism
class EventSourcedAccount:
    def __init__(self):
        self.name = ""
        self.balance = 0

def project_account(event_stream: list[Event]) -> EventSourcedAccount:
    account = EventSourcedAccount()

    for event in event_stream:
        if isinstance(event, Deposit):
            account.balance += event.amount
        elif isinstance(event, Withdraw):
            account.balance -= event.amount
        elif isinstance(event, NameUpdate):
            account.name = event.name

    return account

print(project_account(event_stream)) # EventSourcedAccount(name="Alice", balance="70")
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

## Some General Pitfalls and How to Avoid Them

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

   **Problem:** For teams unfamiliar with event sourcing, there's a learning curve:

   > "For people who've not ever done it, it takes time to teach them to do it. If they've never experienced anything like it before, it can be quite a mental leap." -- Ted

   **Solution:** Invest in upfront learning and knowledge sharing. Have your team spend time studying event sourcing patterns before making key decisions. Mistakes can be costly, so this initial investment pays off.

## Mistakes I Made With My Team

### Overreliance on a Single Projector / Aggregate

Deeper into event sourcing, one pattern emerges: Coupling your aggregates with your commands and queries (**CQ**RS). Leaning into the abstraction, there is no true representation of the data but the event stream itself. Every projection, even one that represents your biggest domain model, is still only a subset of the data. Projections are only views into the true data. So now consider writing a query. You can be selective about what you project, and do it into whatever shape you want. You can project directly into the shape the API client is expecting, for example.

   **Mistake:** Having only one projector, which projects into a mega aggregate, which has data on it for all kinds of different functionality. Then transforming that model to the thing we need at the moment.

   > "We made only a single projector into a huge aggregate that had, among other things, the primary domain object, then performed all kinds of complicated and error prone operations to coerce that object into what we ultimately wanted for whatever task we tried to accomplish." -- Sully

   **Next time:** Bring projection logic closer to the query. Instead of always projecting into the same aggregate with the same domain model, then transforming that, prefer projecting into the shape you need directly. This will save a ton of unnecessary wiring.

### Overreliance on a Centralized Service Class

It's happened to all of us: One big house for all of our reads/writes to the event stream, all operating around one central, mega domain object, which we got from our one mega aggregate.

The class never fell into statefulness or anything, it just accumulated lots of methods. But here's the thing: Its existence was predicated on the concept of one centralized domain model. That model is the underlying common theme among all those methods. If we dispense with the concept of this one big model, we can decouple all those methods. So instead of having this central spot where all the model transformation logic lives, we could use projection to shape each query, and put that projection logic right into the query itself. Furthermore, we could accumulate common projection patterns, make them composable, and generate a simple DSL for for querying the event stream.

**Mistake:** We ended up growing our single aggregate and its service class over time to handle all the different functionality we kept programming into it.

**Next time:** Use a CQRS pattern from the beginning - dispense with the central service class, and put everything we need into commands and queries, including the projection logic to query the event stream.

## Best Practices

* When designing events, model around verbs (actions), not nouns (entities).

For example: instead having an object `car`,  with methods like `car.start()`, which populate state `car.started = true`, then saving `car.save()`, you drop events into the event stream, like `CarStarted(car_id)`. Then when someone needs to know how many running cars there are, they can count `CarStarted` events (minus `CarStopped` events?) or something.

* Strongly consider using a CQRS pattern

## Summary

- Use event sourcing when you want auditability, traceability, and temporal state recreation.
- Complex domains with evolving business rules benefit from it.
- It's a natural fit for event-driven architectures.
- Be prepared for everyone to study event sourcing architectural patterns.
- Invest time in event storming and proper domain modeling before implementation.
- Keep events small and discrete to avoid painful upcasting issues.
- If your use case is simple or your team unlikely to embrace alternative architectural patterns, consider using simpler persistence models.

