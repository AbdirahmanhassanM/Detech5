#!/bin/bash

# Number of nodes to test
TOTAL_NODES=${1:-3}

# Start consensus on all nodes
for i in $(seq 0 $(($TOTAL_NODES-1))); do
  echo "Starting consensus on node $i"
  curl -s "http://localhost:$((3000+$i))/start"
  echo ""
done

# Wait for consensus to be reached
echo "Waiting for consensus to be reached..."
sleep 5

# Check the state of all nodes
echo "Checking node states:"
for i in $(seq 0 $(($TOTAL_NODES-1))); do
  echo -n "Node $i: "
  curl -s "http://localhost:$((3000+$i))/getState"
  echo ""
done 