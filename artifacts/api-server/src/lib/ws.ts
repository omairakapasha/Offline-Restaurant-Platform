import type { KitchenWebSocketManager, KitchenMessage } from './websocket.js';

let _manager: KitchenWebSocketManager | null = null;

export function setWsManager(m: KitchenWebSocketManager): void {
  _manager = m;
}

export function broadcast(msg: KitchenMessage): void {
  _manager?.broadcast(msg);
}
