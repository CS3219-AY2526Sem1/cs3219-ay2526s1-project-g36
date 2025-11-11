import {
  WebSocketGateway,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  WebSocketServer,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { AuthService } from 'src/auth/auth.service';
import { CollabService } from './collab.service';
import { toUint8 } from './helpers';
import { BurstBuffer } from './types';
import { TYPE_BURST_MS, MAX_BURST_MS, ALLOWED_LANGUAGES } from './helpers';
import { flushBurst } from './burst-manager';

const bursts = new Map<string, BurstBuffer>(); // key = `${sessionId}:${userId}`

@WebSocketGateway({ namespace: '/collab', transports: ['websocket'] })
export class CollabGateway {
  constructor(
    private readonly auth: AuthService,
    private readonly collab: CollabService,
  ) {}

  @WebSocketServer()
  server: Server;

  async handleConnection(client: Socket) {
    try {
      // read token from handshake auth
      const token = (client.handshake.auth?.token as string) || null;
      // verify JWT
      const { userId } = this.auth.verify(token);

      const sessionId = (
        client.handshake.auth.sessionId as string | null
      ).trim();
      if (!sessionId) {
        client.emit('collab:error', {
          ok: false,
          message: 'No sessionId provided',
        });
        client.disconnect();
        return;
      }

      // attach userId and sessionId to socket
      client.data.userId = userId;
      client.data.sessionId = sessionId;

      // join room based on sessionId
      await client.join('session:' + sessionId);

      // send current doc state to the client
      const state = await this.collab.encodeCurrentState(sessionId);
      client.emit('collab:state', state);

      // send current language to the client
      const language = await this.collab.getLanguage(sessionId);
      client.emit('collab:language', { language });

      // small emit to confirm connection
      client.emit('collab:connected', { ok: true, userId, sessionId });
    } catch (error) {
      try {
        client.emit('collab:error', {
          ok: false,
          message: (error as Error).message,
        });
      } catch (error) {
        console.error('Error during WebSocket connection:', error);
      }
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const { userId, sessionId } = client.data;
    console.log(`User ${userId} disconnected from session ${sessionId}`);
  }

  @SubscribeMessage('collab:update')
  async handleStateUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() updateData: unknown,
  ) {
    const sessionId = client.data.sessionId as string;
    if (!sessionId) {
      return;
    }

    const update = toUint8(updateData);

    // apply to server doc
    const historyRecord = await this.collab.applyAndPersistUpdate(
      sessionId,
      update,
      client.data.userId,
    );

    // broadcast to other clients in the same session
    client.to('session:' + sessionId).emit('collab:update', update);

    if (historyRecord && historyRecord.changes.length > 0) {
      const key = `${sessionId}:${client.data.userId}`;
      const now = Date.now();
      const existing = bursts.get(key);

      if (!existing) {
        const timer = setTimeout(
          () => flushBurst(this.server, sessionId, key, bursts),
          TYPE_BURST_MS,
        );
        bursts.set(key, {
          timer,
          startedAt: now,
          lastAt: now,
          lastLine: historyRecord.changes[0]?.line ?? null,
          records: [historyRecord],
        });
      } else {
        const sameLine =
          existing.lastLine !== null &&
          historyRecord.changes.length &&
          historyRecord.changes[0].line === existing.lastLine;

        const withinBurst = now - existing.lastAt <= TYPE_BURST_MS;
        const withinMax = now - existing.startedAt <= MAX_BURST_MS;

        if (withinBurst && (sameLine || true) && withinMax) {
          // extend current burst
          existing.records.push(historyRecord);
          existing.lastAt = now;
          existing.lastLine =
            historyRecord.changes[0]?.line ?? existing.lastLine;
          if (existing.timer) clearTimeout(existing.timer);
          existing.timer = setTimeout(
            () => flushBurst(this.server, sessionId, key, bursts),
            TYPE_BURST_MS,
          );
        } else {
          // close old burst and start a new one
          flushBurst(this.server, sessionId, key, bursts);
          const timer = setTimeout(
            () => flushBurst(this.server, sessionId, key, bursts),
            TYPE_BURST_MS,
          );
          bursts.set(key, {
            timer,
            startedAt: now,
            lastAt: now,
            lastLine: historyRecord.changes[0]?.line ?? null,
            records: [historyRecord],
          });
        }
      }
    }
  }

  @SubscribeMessage('collab:history:get')
  async handleGetHistory(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { limit?: number },
  ) {
    const sessionId = client.data.sessionId as string;
    if (!sessionId) {
      return;
    }

    const limit = payload?.limit ?? 50;
    const history = await this.collab.getHistory(sessionId, limit);

    client.emit('collab:history', history);
  }

  @SubscribeMessage('collab:language:set')
  handleSetLanguage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { language: string },
  ) {
    const sessionId = client.data.sessionId as string;
    const language = body.language.toLowerCase();
    if (!sessionId || !ALLOWED_LANGUAGES.has(language)) {
      client.emit('collab:error', {
        ok: false,
        message: 'Invalid sessionId or unsupported language',
      });
      return;
    }
    this.collab.setLanguage(sessionId, language);

    client.to('session:' + sessionId).emit('collab:language', { language });
  }

  @SubscribeMessage('collab:revert')
  async handleRevert(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { timestamp: number },
  ) {
    const sessionId = client.data.sessionId as string;
    if (!sessionId) return;

    // run atomic hard-reset
    const { state, history } = await this.collab.revertHard(
      sessionId,
      body.timestamp,
      client.data.userId,
    );

    // broadcast a fresh full state
    this.server.to('session:' + sessionId).emit('collab:state', state);

    // refresh history list
    this.server.to('session:' + sessionId).emit('collab:history', history);
  }

  @SubscribeMessage('collab:awareness')
  handleAwarenessUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() awarenessData: unknown,
  ) {
    const sessionId = client.data.sessionId as string;
    if (!sessionId) {
      return;
    }

    const update = toUint8(awarenessData);

    client.to('session:' + sessionId).emit('collab:awareness', update);
  }

  @SubscribeMessage('collab:listAllRooms')
  async listAllRooms(@ConnectedSocket() client: Socket) {
    const sockets = await this.server.fetchSockets();

    const roomDetails: Record<string, string[]> = {};
    for (const socket of sockets) {
      for (const room of socket.rooms) {
        if (room === socket.id) continue; // skip individual socket room
        if (!roomDetails[room]) {
          roomDetails[room] = [];
        }
        roomDetails[room].push(socket.id);
      }
    }

    client.emit('collab:roomDetails', roomDetails);
  }
}
