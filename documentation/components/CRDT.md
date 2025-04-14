## Overview of Conflict-Free Replicated Data Types (CRDTs)
A Conflict-Free Replicated Data Type (CRDT) is a data structure designed for distributed systems where multiple nodes can simultaneously modify shared data. CRDTs allow local operations without immediate synchronization, enabling each replica to merge changes later without conflicts. In collaborative text editing, CRDTs help ensure consistency and preserve user intent by providing unique identifiers for each text element and a deterministic merge strategy.

## Purpose of TiTreeNode
TiTreeNode serves as a local data structure that implements a CRDT-based approach for collaborative text editing. It holds information about individual text units (such as characters or segments) and their relationships within a larger document. Each TiTreeNode typically stores:
- A **timestamp** composed of a numerical `id` and a `replicaId`, ensuring each text element is globally unique.
- A **parent timestamp** that references the node’s parent in the document structure, enabling hierarchical organization.
- A **value** field that represents the text content.
- A **tombstone** flag marking deleted text elements while preserving historical context for concurrency control.
- A collection of **child timestamps**, which point to subsequent text nodes.

This structure lets multiple editors insert, delete, or update text concurrently. The merge logic uses timestamps to order or layer changes without overwriting other replicas’ modifications. When multiple changes occur, each TiTreeNode’s unique timestamp and parent reference maintain document integrity.

## Role of the Model Transformer
A model transformer (for example, `collabTexteditorModelTransformer.js`) provides utilities for converting between the local TiTreeNode format and the Protobuf-defined TiTreeNode messages used over gRPC. This separation preserves a clean architecture:
- **Local model**: Used by the front-end for immediate operations and rendering.
- **Protobuf model**: Used to serialize and send data to or receive data from the server.

This translation ensures the local CRDT structure remains consistent with the backend representation, avoiding confusion when updates arrive or are sent over the network. By maintaining a well-defined boundary, the application can evolve the local CRDT logic independently from the RPC interface.

# Detailed Explanation of CRDT and TiTreeNode

## What Is TiTreeNode?

**TiTreeNode** represents a text unit in the front-end’s collaborative data model. Each node contains:
- A **timestamp** composed of `{ replicaId, id }`, uniquely identifying that piece of text.
- A **parent timestamp**, which references the node’s parent in the text structure.
- A **value**, typically the character or text snippet itself.
- A **tombstone** flag indicating whether the text is logically deleted.
- A list of **child timestamps**, linking to subsequent text nodes.

This structure allows management of text edits in a way that multiple users can insert, delete, or reorder text segments without overwriting one another’s changes.

---

## What Is a CRDT?

A **CRDT (Conflict-free Replicated Data Type)** is a mathematical model for managing state across distributed systems in a way that avoids conflicts and ensures eventual consistency. In simpler terms, it’s a data structure that can be **replicated** (copied) across multiple machines or users, so that:
1. **All updates can occur independently**—every user can make changes to their local copy.
2. **No central coordination is needed**—there’s no single “boss” node to approve changes.
3. **All replicas converge**—eventually, given enough time and no further edits, every user ends up with the same final state.

CRDTs accomplish this by using special merge rules that handle concurrent updates automatically, without losing data or causing inconsistent states.

---

## Why CRDT Helps in Collaborative Text Editing

When multiple users are typing in the same document at once, edits may arrive out of order or conflict with each other. A CRDT ensures that:
- **All edits are captured**: Each character insert or delete is recorded with its own unique identifier (the timestamp).
- **No merges are lost**: If two people edit the same spot, the CRDT merges them based on well-defined rules (like parent relationships, timestamps, or numeric ordering).
- **Eventual Consistency**: Even if users are offline or edits arrive later, the data structure guarantees that, once changes propagate to everyone, each user’s document converges to the same content.

---

## How TiTreeNode Fits into CRDT Logic

Each **TiTreeNode**:
- Maintains a timestamp as its identifier. This timestamp is crucial for ordering text parts and merging edits.
- Points to its **parent** so the text’s overall structure (like a sequence or tree) can be reconstructed.
- Tracks **children** by their timestamps to enable reordering or partial insertion operations.
- Uses the **tombstone** flag for “logical deletion.” Rather than removing a node outright, you mark it as deleted, allowing the CRDT to reconcile edits even if the deletion conflicts with other concurrent actions.

---

## The Role of `serviceModelTransformer.js`

- **Transforms** between the local JavaScript CRDT model (`TiTreeNode`) and the **Protobuf** definition (`TiTreeNode` in `.proto`).
- **Serializes** the in-memory node into a format suitable for gRPC-Web communication (so it can be sent to the server).
- **Deserializes** the server’s gRPC responses back into your CRDT objects.

This keeps your collaboration logic clean and consistent, ensuring your CRDT-based text model stays in sync with all remote edits coming through the service.

