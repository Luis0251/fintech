import { Module, Global } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';

@Global()
@Module({
  providers: [EventsService],
  controllers: [EventsController],
  exports: [EventsService],
})
export class EventsModule {}
