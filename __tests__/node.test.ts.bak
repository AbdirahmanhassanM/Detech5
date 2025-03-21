import axios from 'axios';
import { Node, BASE_NODE_PORT } from '../src/nodes/node';

// Increase timeout for all tests
jest.setTimeout(30000);

describe('Node Setup Tests', () => {
  let node: Node;

  beforeEach(() => {
    node = new Node(0, 1, 3);
    node.start();
  });

  afterEach(() => {
    node.stop();
  });

  it('should respond with live status when node is not faulty', async () => {
    const response = await axios.get(`http://localhost:${BASE_NODE_PORT}/status`);
    expect(response.status).toBe(200);
    expect(response.data.message).toBe('live');
  });

  it('should respond with faulty status when node is faulty', async () => {
    const faultyNode = new Node(1, 1, 3, true);
    faultyNode.start();
    
    try {
      await axios.get(`http://localhost:${BASE_NODE_PORT + 1}/status`);
      fail('Expected request to fail');
    } catch (error: any) {
      expect(error.response.status).toBe(500);
      expect(error.response.data.message).toBe('faulty');
    }
    
    faultyNode.stop();
  });

  it('should return correct initial state', async () => {
    const response = await axios.get(`http://localhost:${BASE_NODE_PORT}/getState`);
    expect(response.status).toBe(200);
    expect(response.data).toEqual({
      killed: false,
      x: 1,
      decided: false,
      k: 0
    });
  });

  it('should return null values when node is faulty', async () => {
    const faultyNode = new Node(1, 1, 3, true);
    faultyNode.start();
    
    const response = await axios.get(`http://localhost:${BASE_NODE_PORT + 1}/getState`);
    expect(response.status).toBe(200);
    expect(response.data).toEqual({
      killed: false,
      x: null,
      decided: null,
      k: null
    });
    
    faultyNode.stop();
  });
});

describe('Consensus Tests', () => {
  let nodes: Node[];
  const TOTAL_NODES = 3;

  beforeEach(async () => {
    // Clean up any existing nodes
    nodes = [];
    // Wait a bit to ensure ports are freed
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    for (let i = 0; i < TOTAL_NODES; i++) {
      nodes[i] = new Node(i, (i % 2) as 0 | 1, TOTAL_NODES);
      nodes[i].start();
    }
    // Wait for all nodes to start
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterEach(async () => {
    for (const node of nodes) {
      node.stop();
    }
    // Wait for cleanup
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  it('should reach consensus with no faulty nodes', async () => {
    // Start consensus on all nodes
    await Promise.all(nodes.map(async (_, i) => {
      try {
        await axios.get(`http://localhost:${BASE_NODE_PORT + i}/start`);
      } catch (error) {
        console.error(`Failed to start consensus on node ${i}:`, error);
      }
    }));

    // Wait for consensus to be reached (increased timeout)
    await new Promise(resolve => setTimeout(resolve, 15000));

    // Check final states
    const states = await Promise.all(nodes.map(async (_, i) => {
      try {
        const response = await axios.get(`http://localhost:${BASE_NODE_PORT + i}/getState`);
        return response.data;
      } catch (error) {
        console.error(`Failed to get state from node ${i}:`, error);
        return null;
      }
    }));

    // Filter out any null states
    const validStates = states.filter(state => state !== null);
    expect(validStates.length).toBeGreaterThan(0);
    
    // All nodes should have decided
    validStates.forEach(state => {
      expect(state.decided).toBe(true);
    });

    // All nodes should have the same value
    const consensusValue = validStates[0].x;
    validStates.forEach(state => {
      expect(state.x).toBe(consensusValue);
    });
  });

  it('should handle one faulty node', async () => {
    // Stop all nodes and recreate with one faulty
    nodes.forEach(node => node.stop());
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    nodes = [];
    // Create one faulty node and two normal nodes
    nodes.push(new Node(0, 0, TOTAL_NODES, true));
    nodes.push(new Node(1, 0, TOTAL_NODES, false));
    nodes.push(new Node(2, 0, TOTAL_NODES, false));
    
    // Start all nodes
    nodes.forEach(node => node.start());
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Start consensus on non-faulty nodes
    await Promise.all(nodes.slice(1).map(async (_, i) => {
      try {
        await axios.get(`http://localhost:${BASE_NODE_PORT + i + 1}/start`);
      } catch (error) {
        console.error(`Failed to start consensus on node ${i + 1}:`, error);
      }
    }));

    // Wait for consensus
    await new Promise(resolve => setTimeout(resolve, 15000));

    // Check states of non-faulty nodes
    const states = await Promise.all(nodes.slice(1).map(async (_, i) => {
      try {
        const response = await axios.get(`http://localhost:${BASE_NODE_PORT + i + 1}/getState`);
        return response.data;
      } catch (error) {
        console.error(`Failed to get state from node ${i + 1}:`, error);
        return null;
      }
    }));

    const validStates = states.filter(state => state !== null);
    expect(validStates.length).toBeGreaterThan(0);

    // Non-faulty nodes should have reached consensus
    validStates.forEach(state => {
      expect(state.decided).toBe(true);
    });

    // All non-faulty nodes should have the same value
    const consensusValue = validStates[0].x;
    validStates.forEach(state => {
      expect(state.x).toBe(consensusValue);
    });
  });

  it('should stop consensus when node is killed', async () => {
    // Start consensus
    await axios.get(`http://localhost:${BASE_NODE_PORT}/start`);
    
    // Give it some time to start
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Kill the node
    await axios.get(`http://localhost:${BASE_NODE_PORT}/stop`);
    
    // Check that the node is killed
    const response = await axios.get(`http://localhost:${BASE_NODE_PORT}/getState`);
    expect(response.data.killed).toBe(true);
  });
}); 