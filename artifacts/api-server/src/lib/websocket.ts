import { WebSocket, WebSocketServer } from 'ws';
import { logger } from './logger';

export interface KitchenMessage {
  type: 'order:new' | 'order:updated' | 'order:completed' | 'stock:low';
  order?: any;
  item?: { name: string; remaining: number };
  timestamp: string;
}

interface AliveWebSocket extends WebSocket {
  isAlive: boolean;
}

export class KitchenWebSocketManager {
  private wss: WebSocketServer;
  private clients: Set<AliveWebSocket> = new Set();
  private heartbeatTimer: ReturnType<typeof setInterval>;

  constructor(wss: WebSocketServer) {
    this.wss = wss;
    this.setupConnections();
    // Ping every 30s; terminate clients that didn't respond to the previous ping.
    this.heartbeatTimer = setInterval(() => this.pingAll(), 30_000);
  }

  private pingAll() {
    for (const ws of this.clients) {
      if (!ws.isAlive) {
        ws.terminate();
        this.clients.delete(ws);
        logger.info('Terminated unresponsive WebSocket client');
        continue;
      }
      ws.isAlive = false;
      ws.ping();
    }
  }

  private setupConnections() {
    this.wss.on('connection', (ws: WebSocket) => {
      const client = ws as AliveWebSocket;
      client.isAlive = true;
      logger.info('Kitchen client connected');
      this.clients.add(client);

      client.on('pong', () => { client.isAlive = true; });

      client.on('message', (data: string) => {
        try {
          JSON.parse(data);
        } catch {
          logger.error('Invalid WebSocket message format');
        }
      });

      client.on('close', () => {
        logger.info('Kitchen client disconnected');
        this.clients.delete(client);
      });

      client.on('error', (error) => {
        logger.error('WebSocket error:', error);
        this.clients.delete(client);
      });
    });
  }

  public broadcast(message: KitchenMessage) {
    const payload = JSON.stringify(message);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload, (err) => {
          if (err) {
            logger.error('WebSocket send error', { err });
            this.clients.delete(client);
          }
        });
      }
    }
  }

  public destroy() {
    clearInterval(this.heartbeatTimer);
  }

  public getConnectedClients() {
    return this.clients.size;
  }
}

// Module-level singleton — set once on startup, used everywhere via broadcast().
let _manager: KitchenWebSocketManager | null = null;

export function setWsManager(m: KitchenWebSocketManager): void {
  _manager = m;
}

export function broadcast(msg: KitchenMessage): void {
  _manager?.broadcast(msg);
}

export default KitchenWebSocketManager;
