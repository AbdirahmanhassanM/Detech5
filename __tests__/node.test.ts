import axios from 'axios';
import { Node, BASE_NODE_PORT } from '../src/nodes/node';

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

  beforeEach(() => {
    nodes = [];
    for (let i = 0; i < TOTAL_NODES; i++) {
      nodes[i] = new Node(i, (i % 2) as 0 | 1, TOTAL_NODES);
      nodes[i].start();
    }
  });

  afterEach(() => {
    nodes.forEach(node => node.stop());
  });

  it('should reach consensus with no faulty nodes', async () => {
    // Start consensus on all nodes
    await Promise.all(nodes.map(async (_, i) => {
      await axios.get(`http://localhost:${BASE_NODE_PORT + i}/start`);
    }));

    // Wait for consensus to be reached
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check that all nodes have reached consensus
    const states = await Promise.all(nodes.map(async (_, i) => {
      const response = await axios.get(`http://localhost:${BASE_NODE_PORT + i}/getState`);
      return response.data;
    }));

    // All nodes should have decided
    states.forEach(state => {
      expect(state.decided).toBe(true);
    });

    // All nodes should have the same value
    const consensusValue = states[0].x;
    states.forEach(state => {
      expect(state.x).toBe(consensusValue);
    });
  });

  it('should handle one faulty node', async () => {
    // Make one node faulty
    nodes[0].stop();
    nodes[0] = new Node(0, 0, TOTAL_NODES, true);
    nodes[0].start();

    // Start consensus on non-faulty nodes
    await Promise.all(nodes.slice(1).map(async (_, i) => {
      await axios.get(`http://localhost:${BASE_NODE_PORT + i + 1}/start`);
    }));

    // Wait for consensus to be reached
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check that non-faulty nodes have reached consensus
    const states = await Promise.all(nodes.slice(1).map(async (_, i) => {
      const response = await axios.get(`http://localhost:${BASE_NODE_PORT + i + 1}/getState`);
      return response.data;
    }));

    // Non-faulty nodes should have decided
    states.forEach(state => {
      expect(state.decided).toBe(true);
    });

    // Non-faulty nodes should have the same value
    const consensusValue = states[0].x;
    states.forEach(state => {
      expect(state.x).toBe(consensusValue);
    });
  });

  it('should stop consensus when node is killed', async () => {
    // Start consensus
    await axios.get(`http://localhost:${BASE_NODE_PORT}/start`);
    
    // Kill the node
    await axios.get(`http://localhost:${BASE_NODE_PORT}/stop`);
    
    // Check that the node is killed
    const response = await axios.get(`http://localhost:${BASE_NODE_PORT}/getState`);
    expect(response.data.killed).toBe(true);
  });
}); 