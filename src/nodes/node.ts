import express, { Request, Response } from 'express';
import axios from 'axios';

type MessageType = 'PROPOSE' | 'VOTE';

interface ConsensusMessage {
  type: MessageType;
  sender: number;
  step: number;
  value: 0 | 1 | "?";
}

export type NodeState = {
  killed: boolean;
  x: 0 | 1 | "?" | null;
  decided: boolean | null;
  k: number | null;
};

export const BASE_NODE_PORT = 3000;

export class Node {
  private state: NodeState;
  private app = express();
  private server: any;
  private faulty: boolean;
  private nodeId: number;
  private totalNodes: number;
  private receivedMessages: Map<number, ConsensusMessage[]>;
  private readonly MAJORITY: number;

  constructor(nodeId: number, initialValue: 0 | 1, totalNodes: number, faulty: boolean = false) {
    this.nodeId = nodeId;
    this.totalNodes = totalNodes;
    this.faulty = faulty;
    this.MAJORITY = Math.floor(totalNodes / 2) + 1;
    this.receivedMessages = new Map();
    this.state = {
      killed: false,
      x: faulty ? null : initialValue,
      decided: faulty ? null : false,
      k: faulty ? null : 0
    };

    this.setupRoutes();
  }

  private setupRoutes() {
    this.app.get('/status', (req: Request, res: Response) => {
      if (this.faulty) {
        res.status(500).json({ message: 'faulty' });
      } else {
        res.status(200).json({ message: 'live' });
      }
    });

    this.app.get('/getState', (req: Request, res: Response) => {
      res.json(this.state);
    });

    this.app.get('/stop', (req: Request, res: Response) => {
      this.state.killed = true;
      res.json({ message: 'Node stopped' });
    });

    this.app.get('/start', async (req: Request, res: Response) => {
      if (!this.state.killed && !this.faulty) {
        this.startConsensus();
        res.json({ message: 'Consensus started' });
      } else {
        res.status(400).json({ message: 'Node is killed or faulty' });
      }
    });

    this.app.post('/message', (req: Request, res: Response) => {
      if (!this.state.killed && !this.faulty) {
        this.handleMessage(req.body);
        res.json({ message: 'Message received' });
      } else {
        res.status(400).json({ message: 'Node is killed or faulty' });
      }
    });
  }

  private async startConsensus() {
    if (this.state.killed || this.faulty) return;
    
    while (!this.state.decided && !this.state.killed) {
      // Phase 1: Broadcast proposal
      await this.broadcastMessage('PROPOSE', this.state.x as 0 | 1 | "?");
      await this.waitForMessages(this.state.k!, 'PROPOSE');
      
      // Process received proposals
      const proposals = this.receivedMessages.get(this.state.k!) || [];
      const majorityValue = this.findMajorityValue(proposals);
      
      if (majorityValue !== null) {
        this.state.x = majorityValue;
      } else {
        this.state.x = Math.random() < 0.5 ? 0 : 1;
      }

      // Phase 2: Broadcast vote
      await this.broadcastMessage('VOTE', this.state.x as 0 | 1 | "?");
      await this.waitForMessages(this.state.k!, 'VOTE');
      
      // Process received votes
      const votes = this.receivedMessages.get(this.state.k!) || [];
      const consensusValue = this.findConsensusValue(votes);
      
      if (consensusValue !== null) {
        this.state.x = consensusValue;
        this.state.decided = true;
      } else {
        this.state.x = "?";
      }

      this.state.k!++;
      this.receivedMessages.clear();
    }
  }

  private async broadcastMessage(type: MessageType, value: 0 | 1 | "?") {
    const message: ConsensusMessage = {
      type,
      sender: this.nodeId,
      step: this.state.k!,
      value
    };

    for (let i = 0; i < this.totalNodes; i++) {
      if (i !== this.nodeId) {
        try {
          await axios.post(`http://localhost:${BASE_NODE_PORT + i}/message`, message);
        } catch (error) {
          console.error(`Failed to send message to node ${i}`);
        }
      }
    }
  }

  private async waitForMessages(step: number, type: MessageType) {
    // Simple timeout to collect messages
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private findMajorityValue(messages: ConsensusMessage[]): 0 | 1 | null {
    const counts = new Map<0 | 1, number>();
    
    for (const msg of messages) {
      if (msg.value !== "?") {
        counts.set(msg.value as 0 | 1, (counts.get(msg.value as 0 | 1) || 0) + 1);
      }
    }

    for (const [value, count] of counts.entries()) {
      if (count >= this.MAJORITY) {
        return value;
      }
    }

    return null;
  }

  private findConsensusValue(messages: ConsensusMessage[]): 0 | 1 | null {
    const counts = new Map<0 | 1 | "?", number>();
    
    for (const msg of messages) {
      counts.set(msg.value, (counts.get(msg.value) || 0) + 1);
    }

    for (const [value, count] of counts.entries()) {
      if (count >= this.MAJORITY && value !== "?") {
        return value as 0 | 1;
      }
    }

    return null;
  }

  private handleMessage(message: ConsensusMessage) {
    if (this.state.killed || this.faulty || message.step !== this.state.k) {
      return;
    }

    if (!this.receivedMessages.has(message.step)) {
      this.receivedMessages.set(message.step, []);
    }

    this.receivedMessages.get(message.step)!.push(message);
  }

  public start() {
    const port = BASE_NODE_PORT + this.nodeId;
    this.server = this.app.listen(port, () => {
      console.log(`Node ${this.nodeId} listening on port ${port}`);
    });
  }

  public stop() {
    if (this.server) {
      this.server.close();
    }
  }
} 