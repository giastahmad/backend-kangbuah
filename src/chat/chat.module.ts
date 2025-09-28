import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { SupabaseService } from '../supabase/supabase.service';

@Module({
  controllers: [ChatController],
  providers: [ChatService, SupabaseService],
})
export class ChatModule {}