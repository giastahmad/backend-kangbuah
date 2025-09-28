import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ChatService {
  constructor(private readonly supabase: SupabaseService) {}

  // Customer → semua admin
  async createRoom(customerId: string) {
    const client = this.supabase.getClient();

    // Cek apakah customer sudah punya room
    const { data: existing, error: existingError } = await client
      .from('chat_participants')
      .select('room_id')
      .eq('user_id', customerId)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing) return { room_id: existing.room_id };

    // Ambil semua admin
    const { data: admins, error: adminError } = await client
      .from('users')
      .select('user_id')
      .eq('role', 'ADMIN');

    if (adminError) throw adminError;
    if (!admins || admins.length === 0)
      throw new Error('Belum ada admin terdaftar');

    // Buat room baru
    const roomId = uuidv4();
    const { error: roomError } = await client
      .from('chat_rooms')
      .insert([{ room_id: roomId, created_at: new Date() }]);
    if (roomError) throw roomError;

    // Insert peserta (customer + semua admin)
    const participants = [
      { participants_id: uuidv4(), room_id: roomId, user_id: customerId },
      ...admins.map((a) => ({
        participants_id: uuidv4(),
        room_id: roomId,
        user_id: a.user_id,
      })),
    ];

    const { error: participantsError } = await client
      .from('chat_participants')
      .insert(participants);

    if (participantsError) throw participantsError;

    return { room_id: roomId };
  }

  async sendMessage(roomId: string, senderId: string, message: string) {
    const client = this.supabase.getClient();
    const { data, error } = await client
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

  async getMessages(roomId: string) {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('chat_messages')
      .select('message_id,message_content,user_id,timestamp')
      .eq('room_id', roomId)
      .order('timestamp', { ascending: true });

    if (error) throw error;
    return data;
  }

  async listCustomerChats(adminId: string) {
    const client = this.supabase.getClient();

    // Ambil semua room admin
    const { data: rooms, error: roomError } = await client
      .from('chat_participants')
      .select('room_id,user_id')
      .eq('user_id', adminId);

    if (roomError) throw roomError;
    if (!rooms || rooms.length === 0) return [];

    const roomIds = rooms.map((r) => r.room_id);

    // Ambil customer per room
    const { data: customers, error: custError } = await client
      .from('chat_participants')
      .select('room_id,user_id')
      .in('room_id', roomIds)
      .neq('user_id', adminId);

    if (custError) throw custError;

    return customers;
  }
}
