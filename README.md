# Ben-Or Consensus Algorithm Implementation

This project implements the Ben-Or consensus algorithm for distributed systems. The algorithm allows a set of nodes to reach consensus on a binary value (0 or 1) even in the presence of faulty nodes.

## Overview

The Ben-Or algorithm is a randomized consensus algorithm that guarantees eventual consensus with probability 1. It works in asynchronous distributed systems and can tolerate up to n/2 - 1 faulty nodes, where n is the total number of nodes.

### Algorithm Steps

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

## Project Structure

- `src/nodes/node.ts`: Implementation of a node in the distributed system.
- `src/index.ts`: Entry point for starting a node.
- `__tests__/node.test.ts`: Tests for the node implementation.

## API

Each node exposes the following HTTP endpoints:

- `GET /status`: Returns the status of the node (live or faulty).
- `GET /getState`: Returns the current state of the node.
- `GET /start`: Starts the consensus algorithm on the node.
- `GET /stop`: Stops the node's activity.
- `POST /message`: Receives messages from other nodes.

## Running the Project

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Installation

```bash
npm install
```

### Building the Project

```bash
npm run build
```

### Running Tests

```bash
npm test
```

### Starting a Node

```bash
npm start -- <nodeId> <initialValue> <totalNodes> <faulty>
```

Example:
```bash
# Start node 0 with initial value 1, in a system with 3 nodes, not faulty
npm start -- 0 1 3 false
```

## License

This project is licensed under the MIT License - see the LICENSE file for details. 