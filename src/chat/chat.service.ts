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

    // Langkah 1: Ambil semua room ID tempat admin menjadi partisipan (Tidak berubah)
    const { data: adminRooms, error: roomError } = await client
      .from('chat_participants')
      .select('room_id')
      .eq('user_id', adminId);

    if (roomError) throw roomError;
    if (!adminRooms || adminRooms.length === 0) return [];

    const roomIds = adminRooms.map((r) => r.room_id);

    // Langkah 2 (Refactored): Ambil SEMUA partisipan dari room tersebut (tanpa join)
    const { data: allParticipants, error: participantsError } = await client
      .from('chat_participants')
      .select('room_id, user_id')
      .in('room_id', roomIds);

    if (participantsError) throw participantsError;
    if (!allParticipants || allParticipants.length === 0) return [];

    // Ekstrak semua user ID dari partisipan
    const allUserIds = allParticipants.map((p) => p.user_id);

    // Langkah 3 (Baru): Ambil detail SEMUA user yang terlibat dalam satu query
    const { data: users, error: usersError } = await client
      .from('users')
      .select('user_id, username, role')
      .in('user_id', allUserIds);

    if (usersError) throw usersError;

    // Buat Peta (Map) untuk data user agar mudah diakses: user_id -> { username, role }
    const userMap = new Map(
      users.map((u) => [u.user_id, { username: u.username, role: u.role }]),
    );

    // Langkah 4: Ambil pesan terakhir untuk setiap room (Tidak berubah)
    const { data: lastMessages, error: messagesError } = await client
      .from('chat_messages')
      .select('room_id, message_content, timestamp')
      .in('room_id', roomIds)
      .order('timestamp', { ascending: false });

    if (messagesError) throw messagesError;
    const lastMessageMap = new Map();
    if (lastMessages) {
      for (const msg of lastMessages) {
        if (!lastMessageMap.has(msg.room_id)) {
          lastMessageMap.set(msg.room_id, msg.message_content);
        }
      }
    }

    // Langkah 5: Gabungkan semua data dengan logika di TypeScript
    const customerChats = new Map();
    for (const participant of allParticipants) {
      const userDetails = userMap.get(participant.user_id);

      // Proses hanya jika user adalah CUSTOMER
      if (userDetails && userDetails.role === 'CUSTOMER') {
        customerChats.set(participant.room_id, {
          id: participant.room_id,
          name: userDetails.username,
          last: lastMessageMap.get(participant.room_id) || 'Belum ada pesan.',
          unread: 0,
        });
      }
    }

    return Array.from(customerChats.values());
  }
}
