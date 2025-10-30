import {
  WebSocketGateway,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  WebSocketServer,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { WsAuthGuard } from '../../../api/src/auth/ws-auth.guard';
import { Socket, Server } from 'socket.io';
import { CollabService } from './collab.service';
import { toUint8 } from './helpers';

@UseGuards(WsAuthGuard)
@WebSocketGateway({ namespace: '/collab', transports: ['websocket'] })
export class CollabGateway {
  constructor(private readonly collab: CollabService) {}

  @WebSocketServer()
  server: Server;

  async handleConnection(client: Socket) {
    try {
      const sessionId = (
        client.handshake.auth.sessionId as string | null
      ).trim();
      console.log('Client attempting to connect with sessionId:', sessionId);
      if (!sessionId) {
        console.log('No sessionId provided, disconnecting client');
        client.emit('collab:error', {
          ok: false,
          message: 'No sessionId provided',
        });
        client.disconnect();
        return;
      }

      const userId = client.data.user as string;
      client.data.sessionId = sessionId;

      // join room based on sessionId
      await client.join('session:' + sessionId);

      // send current doc state to the client
      const state = await this.collab.encodeCurrentState(sessionId);
      client.emit('collab:state', state);

      // small emit to confirm connection
      client.emit('collab:connected', { ok: true, userId, sessionId });
      console.log(`User ${userId} connected to session ${sessionId}`);
      console.log('Current rooms:', client.rooms);
    } catch (error) {
      try {
        console.error('Error during WebSocket connection:', error);
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

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    console.log('Ping received:', data);
    client.emit('pong', { msg: 'Hello from server!' });
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
    await this.collab.applyAndPersistUpdate(sessionId, update);

    // broadcast to other clients in the same session
    client.to('session:' + sessionId).emit('collab:update', update);
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
    console.log('Room details sent to client:', roomDetails);
  }
}
