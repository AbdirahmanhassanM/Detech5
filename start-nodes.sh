#!/bin/bash

# Build the project
npm run build

# Number of nodes to start
TOTAL_NODES=${1:-3}

# Kill any existing node processes
pkill -f "node dist/index.js" || true

# Start nodes
for i in $(seq 0 $(($TOTAL_NODES-1))); do
  # Alternate initial values between 0 and 1
  INITIAL_VALUE=$(($i % 2))
  
  # Start the node in the background
  node dist/index.js $i $INITIAL_VALUE $TOTAL_NODES false &
  
  echo "Started node $i with initial value $INITIAL_VALUE"
  
  # Wait a bit to avoid port conflicts
  sleep 1
done

echo "All $TOTAL_NODES nodes started"
echo "Press Ctrl+C to stop all nodes"

# Wait for user to press Ctrl+C 