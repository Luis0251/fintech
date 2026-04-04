import { Controller, Get, Res, Query } from '@nestjs/common';
import { Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private eventsService: EventsService) {}

  @Get('stream')
  async streamEvents(
    @Query('token') token: string,
    @Res() res: Response
  ) {
    if (!token) {
      res.status(401).json({ error: 'Token required' });
      return;
    }

    // Manually validate token and get user
    const jwtService = new JwtService({
      secret: process.env.JWT_SECRET || 'fintech-secret-key-change-in-prod',
    });

    let userId: string;
    try {
      const payload = jwtService.verify(token);
      userId = payload.sub;
    } catch {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    if (!userId) {
      res.status(401).json({ error: 'Invalid token payload' });
      return;
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', userId })}\n\n`);

    console.log(`📡 User ${userId} connected to SSE stream`);

    // Subscribe to events
    const subscription = this.eventsService.getEventsStream(userId).subscribe({
      next: (event) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      },
      error: (err) => {
        console.error('SSE error:', err);
        res.end();
      },
    });

    // Handle client disconnect
    res.on('close', () => {
      console.log(`📡 User ${userId} disconnected from SSE stream`);
      subscription.unsubscribe();
    });
  }
}
