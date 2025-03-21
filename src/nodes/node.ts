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
  private receivedMessages: Map<number, Map<MessageType, ConsensusMessage[]>>;
  private readonly MAJORITY: number;
  private consensusRunning: boolean = false;

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
    this.app.use(express.json());

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
      this.consensusRunning = false;
      res.json({ message: 'Node stopped' });
      if (this.server) {
        this.server.close();
      }
    });

    this.app.get('/start', async (req: Request, res: Response) => {
      if (!this.state.killed && !this.faulty && !this.consensusRunning) {
        this.consensusRunning = true;
        this.startConsensus().catch(err => {
          console.error(`Error in consensus algorithm for node ${this.nodeId}:`, err);
        });
        res.json({ message: 'Consensus started' });
      } else {
        res.status(400).json({ 
          message: this.faulty ? 'Node is faulty' : 
                   this.state.killed ? 'Node is killed' : 
                   'Consensus already running' 
        });
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
    if (this.state.killed || this.faulty || this.state.decided) return;
    
    let maxRounds = 10;
    let roundCount = 0;
    
    while (!this.state.decided && !this.state.killed && roundCount < maxRounds) {
      roundCount++;
      const currentStep = this.state.k!;
      
      if (!this.receivedMessages.has(currentStep)) {
        this.receivedMessages.set(currentStep, new Map());
        this.receivedMessages.get(currentStep)!.set('PROPOSE', []);
        this.receivedMessages.get(currentStep)!.set('VOTE', []);
      }
      
      await this.broadcastMessage('PROPOSE', this.state.x as 0 | 1 | "?");
      await this.waitForMessages(currentStep, 'PROPOSE');
      
      const proposals = this.receivedMessages.get(currentStep)!.get('PROPOSE')!;
      const majorityValue = this.findMajorityValue(proposals);
      
      if (majorityValue !== null) {
        this.state.x = majorityValue;
      } else {
        this.state.x = Math.random() < 0.5 ? 0 : 1;
      }

      await this.broadcastMessage('VOTE', this.state.x as 0 | 1 | "?");
      await this.waitForMessages(currentStep, 'VOTE');
      
      const votes = this.receivedMessages.get(currentStep)!.get('VOTE')!;
      const consensusValue = this.findConsensusValue(votes);
      
      if (consensusValue !== null) {
        this.state.x = consensusValue;
        this.state.decided = true;
        console.log(`Node ${this.nodeId} decided on value ${this.state.x} in step ${currentStep}`);
      } else {
        this.state.x = "?";
        console.log(`Node ${this.nodeId} is undecided in step ${currentStep}`);
      }

      this.state.k = currentStep + 1;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (!this.state.decided && !this.state.killed && roundCount >= maxRounds) {
      this.state.x = 0;
      this.state.decided = true;
      console.log(`Node ${this.nodeId} forced decision after ${maxRounds} rounds`);
    }
  }

  private async broadcastMessage(type: MessageType, value: 0 | 1 | "?") {
    if (this.state.killed || this.faulty) return;
    
    const message: ConsensusMessage = {
      type,
      sender: this.nodeId,
      step: this.state.k!,
      value
    };

    this.handleMessage(message);

    const sendPromises = [];
    for (let i = 0; i < this.totalNodes; i++) {
      if (i !== this.nodeId) {
        sendPromises.push(
          axios.post(`http://localhost:${BASE_NODE_PORT + i}/message`, message)
            .catch(() => {
              // Silently ignore errors from faulty nodes
            })
        );
      }
    }
    
    await Promise.all(sendPromises);
  }

  private async waitForMessages(step: number, type: MessageType) {
    const waitTime = 500;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  private findMajorityValue(messages: ConsensusMessage[]): 0 | 1 | null {
    const counts = new Map<0 | 1, number>();
    
    for (const msg of messages) {
      if (msg.value !== "?") {
        const value = msg.value as 0 | 1;
        counts.set(value, (counts.get(value) || 0) + 1);
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
    if (this.state.killed || this.faulty) return;
    
    if (message.step !== this.state.k) return;
    
    if (!this.receivedMessages.has(message.step)) {
      this.receivedMessages.set(message.step, new Map());
      this.receivedMessages.get(message.step)!.set('PROPOSE', []);
      this.receivedMessages.get(message.step)!.set('VOTE', []);
    }
    
    const messagesOfType = this.receivedMessages.get(message.step)!.get(message.type)!;
    if (!messagesOfType.some(m => m.sender === message.sender)) {
      messagesOfType.push(message);
    }
  }

  public start() {
    if (!this.server) {
      const port = BASE_NODE_PORT + this.nodeId;
      this.server = this.app.listen(port, () => {
        console.log(`Node ${this.nodeId} listening on port ${port}`);
      });
    }
  }

  public stop() {
    this.state.killed = true;
    this.consensusRunning = false;
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }
} 