// src/chat/chat.service.ts
import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ChatService {
  constructor(private readonly supabase: SupabaseService) {}

  // Buat room baru (1 customer + 1 admin)
  async createRoom(customerId: string, adminId: string) {
    const { data: existing, error: existingError } = await this.supabase
      .getClient()
      .from('chat_participants')
      .select('room_id')
      .eq('user_id', customerId)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing) return { room_id: existing.room_id };

    const roomId = uuidv4();

    const { error: roomError } = await this.supabase
      .getClient()
      .from('chat_rooms')
      .insert([{ room_id: roomId, created_at: new Date() }]);

    if (roomError) throw roomError;

    const { error: participantsError } = await this.supabase
      .getClient()
      .from('chat_participants')
      .insert([
        { participants_id: uuidv4(), room_id: roomId, user_id: customerId },
        { participants_id: uuidv4(), room_id: roomId, user_id: adminId },
      ]);

    if (participantsError) throw participantsError;

    return { room_id: roomId };
  }

  // Kirim pesan
  async sendMessage(roomId: string, senderId: string, message: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('chat_messages')
      .insert([
        {
          message_id: uuidv4(),
          room_id: roomId,
          user_id: senderId,
          message_content: message,
          timestamp: new Date(),
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Ambil semua pesan dalam room
  async getMessages(roomId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('chat_messages')
      .select(`
        message_id,
        message_content,
        user_id,
        timestamp
      `)
      .eq('room_id', roomId)
      .order('timestamp', { ascending: true });

    if (error) throw error;
    return data;
  }

  // Admin: list semua chat (customer + room)
  async listCustomerChats(adminId: string) {
    const { data: adminRooms, error: adminError } = await this.supabase
      .getClient()
      .from('chat_participants')
      .select('room_id')
      .eq('user_id', adminId);

    if (adminError) throw adminError;
    if (!adminRooms || adminRooms.length === 0) return [];

    const roomIds = adminRooms.map((r) => r.room_id);

    const { data: customers, error: custError } = await this.supabase
      .getClient()
      .from('chat_participants')
      .select('room_id, user_id')
      .in('room_id', roomIds)
      .neq('user_id', adminId);

    if (custError) throw custError;

    return customers;
  }
}
