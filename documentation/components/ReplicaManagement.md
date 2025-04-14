# Replica Management and Creation in the Front-End

## Overview
This architecture features a collaborative editing system that assigns a unique replica identifier to each participant, ensuring conflict-free integration of updates. The approach relies on a CRDT-based structure where every connecting instance is considered a separate replica.

## Session and Replica Creation
- Each new participant either creates a new session ID or joins an existing one.  
- The back-end returns a unique `sessionId` and a `replicaId` upon successful connection.  
- The front-end uses `CollabTexteditorClient` to call `createSessionId` or `joinSession`, storing the returned `replicaId` internally.  

## Streaming Updates
- The front-end subscribes to remote updates by calling `subscribeForUpdates`.  
- The server streams all modifications from other replicas.  
- The CRDT logic merges incoming changes according to timestamp and hierarchy rules.  
- The subscription loop automatically reconnects if the stream closes or encounters errors.  

## Replica Functions in Front-End Code
- **Joining a Session**: The `joinSession` method requests a `replicaId` for an existing session.  
- **Local Updates**: The `sendLocalUpdate` function delivers changes from the local replica to the server, preserving order and timestamps.  
- **Remote Updates**: The `subscribeForUpdates` function applies incoming changes from other replicas to the local CRDT, allowing concurrent edits without data loss.  

## Role in Collaborative Editing
- Each participant, identified by a distinct `replicaId`, can insert or delete content independently.  
- All changes merge without overwriting due to CRDT conflict-resolution mechanics.  
- This design prevents divergence between replicas by ensuring a deterministic approach for handling simultaneous modifications.  

## External Dependencies
- **codemirror**: Provides the in-browser text editor interface.  
- **core-js**: Supplies JavaScript polyfills for legacy environments.  
- **regenerator-runtime**: Supports `async` and `await` operations.  
- **google-protobuf**: Enables serialization and deserialization of protobuf messages.  
- **grpc-web**: Facilitates communication between front-end code and the back-end gRPC service.  
- **sass** (`.scss` files): Adds custom styling for UI components.

# Replica Management and Creation in the Back-End

## Session and Replica Tracking
The back-end code maintains a central `Repository` containing a mapping of active session IDs to session objects. Each session records replica data and a chronological history of updates. Whenever a new session is requested, the code generates a unique session token and creates a corresponding `Session` structure. Existing sessions are retrieved from the same repository.

## Replicas
Each session tracks multiple replicas through a map of replica IDs to `Replica` objects. A replica ID is automatically assigned whenever a participant joins a session by invoking `JoinSession`. The `Replica` structure stores:
- A numerical `ReplicaId`
- An associated `NickName`
- A dedicated `Channel` for streaming updates

This mechanism ensures that each connection can publish or consume data without conflicting with other replicas in the same session.

## Update Streaming
The back-end employs a server-side stream in `SubscribeForRemoteUpdates`. The session look-up confirms the validity of the requested session and replica ID. If valid, the code sends any historical updates to the subscriber, then creates a channel for future updates. This channel is monitored in a loop, and each broadcast is forwarded to every active replica except the sender.

When the connection ends or the stream context is canceled, the channel closes, and the replica is removed. If no more replicas remain, the session is pruned from the repository.

## Change Broadcasting
All local modifications arrive via `SendLocalUpdate`. The server captures the changed node, logs the event, and broadcasts a corresponding message to other channels in the same session. The request includes:
- The current `sessionId`
- The sender’s `replicaId`
- The updated `TiTreeNode` data

The server constructs a `RemoteUpdateResponse` and appends it to the session’s history. Any listening replicas receive the same update, ensuring consistent state across participants.

## Graceful Shutdown
When a termination signal is caught, all remaining channels are closed. Each replica is removed, and any remaining session references are freed. This approach helps avoid lingering resources and ensures the server cleanly shuts down.

## External Dependencies
- **golang.org/x/net/context**: Manages streaming cancellation and request context.  
- **google.golang.org/grpc**: Provides gRPC infrastructure.  
- **google.golang.org/grpc/reflection**: Enables reflection for debugging and introspection.  
- **github.com/openai/openai-go**: Supplies AI-driven diagram generation through the Chat Completions API.  
- **crypto/rand**, **encoding/base32**: Generates unique session tokens.  
- **log**, **net**, **os/signal**, **syscall**: Handles logging, networking, and graceful shutdown events.  
