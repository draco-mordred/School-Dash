import { Server as HTTPServer } from 'http';
import WebSocket, { WebSocketServer } from 'ws';

let wss: WebSocketServer | null = null;

export function initWebSocket(server: HTTPServer) {
  if (wss) return wss;
  wss = new WebSocketServer({ server });
  wss.on('connection', (ws, req) => {
    console.log('WebSocket client connected');
    ws.on('message', (msg) => {
      try { console.log('WS message', msg.toString()); } catch {}
    });
    ws.on('close', () => console.log('WebSocket client disconnected'));
  });
  return wss;
}

export function broadcastWS(data: any) {
  if (!wss) return;
  const payload = typeof data === 'string' ? data : JSON.stringify(data);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(payload);
  }
}

export default { initWebSocket, broadcastWS };
