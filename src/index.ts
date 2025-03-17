import { Node } from './nodes/node';

// Parse command line arguments
const args = process.argv.slice(2);
const nodeId = parseInt(args[0] || '0', 10);
const initialValue = parseInt(args[1] || '0', 10) as 0 | 1;
const totalNodes = parseInt(args[2] || '3', 10);
const faulty = args[3] === 'true';

// Create and start the node
const node = new Node(nodeId, initialValue, totalNodes, faulty);
node.start();

console.log(`Node ${nodeId} started with initial value ${initialValue}`);
console.log(`Total nodes: ${totalNodes}, Faulty: ${faulty}`);
console.log(`Listening on port ${3000 + nodeId}`);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(`Stopping node ${nodeId}...`);
  node.stop();
  process.exit(0);
}); 