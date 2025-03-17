# Ben-Or Consensus Algorithm Implementation

This document provides a summary of the implementation of the Ben-Or consensus algorithm.

## Overview

The Ben-Or algorithm is a randomized consensus algorithm that allows a set of distributed nodes to reach agreement on a binary value (0 or 1) even in the presence of faulty nodes. The algorithm works in asynchronous systems and can tolerate up to n/2 - 1 faulty nodes, where n is the total number of nodes.

## Implementation Details

### Node Class

The core of the implementation is the `Node` class in `src/nodes/node.ts`. Each node:

- Has a unique ID
- Listens on a port determined by `BASE_NODE_PORT + nodeId`
- Maintains its state (value, decision status, step)
- Can be marked as faulty
- Communicates with other nodes via HTTP

### Node State

Each node maintains a state with the following properties:

```typescript
type NodeState = {
  killed: boolean;  // Whether the node has been stopped
  x: 0 | 1 | "?" | null;  // Current consensus value
  decided: boolean | null;  // Whether the node has reached a decision
  k: number | null;  // Current step/round
};
```

### HTTP Endpoints

Each node exposes the following HTTP endpoints:

- `GET /status`: Returns the status of the node (live or faulty)
- `GET /getState`: Returns the current state of the node
- `GET /start`: Starts the consensus algorithm
- `GET /stop`: Stops the node's activity
- `POST /message`: Receives messages from other nodes

### Consensus Algorithm

The consensus algorithm is implemented in the `startConsensus` method of the `Node` class. It follows these steps:

1. Each node starts with an initial binary value (0 or 1).
2. The algorithm proceeds in rounds (k).
3. In each round:
   - Phase 1: Each node broadcasts its current value.
   - If a node receives a majority of the same value, it adopts that value.
   - Otherwise, it randomly chooses a new value.
   - Phase 2: Each node broadcasts its updated value.
   - If a node receives a majority of the same value, it decides on that value.
   - Otherwise, it sets its value to "undecided" (?) and continues to the next round.
4. Once a node decides on a value, it stops participating in the algorithm.

### Message Handling

Nodes communicate by sending messages with the following structure:

```typescript
interface ConsensusMessage {
  type: 'PROPOSE' | 'VOTE';  // Message type
  sender: number;  // Sender node ID
  step: number;  // Current step/round
  value: 0 | 1 | "?";  // Value being proposed or voted on
}
```

### Fault Tolerance

The implementation handles faulty nodes by:

- Marking nodes as faulty in the constructor
- Setting all state values to `null` for faulty nodes
- Returning a 500 status code for the `/status` endpoint
- Ignoring messages from faulty nodes
- Calculating the majority threshold based on non-faulty nodes

## Running the Implementation

### Starting Nodes

To start a node:

```bash
npm start -- <nodeId> <initialValue> <totalNodes> <faulty>
```

Example:
```bash
npm start -- 0 1 3 false
```

### Running Tests

To run the tests:

```bash
npm test
```

### Starting Multiple Nodes

To start multiple nodes for testing:

```bash
./start-nodes.sh <totalNodes>
```

### Testing Consensus

To test the consensus algorithm:

```bash
./test-consensus.sh <totalNodes>
```

## Conclusion

This implementation provides a working version of the Ben-Or consensus algorithm that can be used to study distributed consensus in the presence of faulty nodes. The code is structured to be easy to understand and extend for further research or educational purposes. 