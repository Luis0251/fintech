import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';

export interface ServerEvent {
  type: 'transaction' | 'account' | 'budget' | 'goal' | 'insight';
  action: 'created' | 'updated' | 'deleted';
  data: any;
  timestamp: number;
}

@Injectable()
export class EventsService implements OnModuleInit, OnModuleDestroy {
  private events$ = new Subject<ServerEvent>();
  private userConnections = new Map<string, Set<(event: ServerEvent) => void>>();

  onModuleInit() {
    console.log('📡 EventsService initialized');
  }

  onModuleDestroy() {
    this.events$.complete();
  }

  /**
   * Get SSE stream for a specific user
   */
  getEventsStream(userId: string): Observable<ServerEvent> {
    return new Observable<ServerEvent>((observer) => {
      // Subscribe to the main events Subject
      const subscription = this.events$.subscribe({
        next: (event) => {
          // Only emit events that belong to this user
          if (this.shouldEmitToUser(event, userId)) {
            observer.next(event);
          }
        },
        error: (err) => observer.error(err),
        complete: () => observer.complete(),
      });

      // Cleanup on disconnect
      return () => {
        subscription.unsubscribe();
      };
    });
  }

  /**
   * Check if event should be emitted to user
   */
  private shouldEmitToUser(event: ServerEvent, userId: string): boolean {
    // For now, emit all events - frontend will filter based on user context
    // In future, we can add userId to event data for granular filtering
    return true;
  }

  /**
   * Emit an event to all connected clients
   */
  emit(event: ServerEvent): void {
    console.log(`📡 Emitting event: ${event.type}.${event.action}`);
    this.events$.next(event);
  }

  /**
   * Emit transaction event
   */
  emitTransaction(action: 'created' | 'updated' | 'deleted', data: any): void {
    this.emit({
      type: 'transaction',
      action,
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Emit account event
   */
  emitAccount(action: 'created' | 'updated' | 'deleted', data: any): void {
    this.emit({
      type: 'account',
      action,
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Emit budget event
   */
  emitBudget(action: 'created' | 'updated' | 'deleted', data: any): void {
    this.emit({
      type: 'budget',
      action,
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Emit goal event
   */
  emitGoal(action: 'created' | 'updated' | 'deleted', data: any): void {
    this.emit({
      type: 'goal',
      action,
      data,
      timestamp: Date.now(),
    });
  }
}
