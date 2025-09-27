// src/supabase/supabase.service.ts
import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
    );
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  async createUser(user: {
    user_id: string;
    username: string;
    email: string;
    password: string;
    role: string;
    company_name?: string;
    npwp?: string;
    phone_number?: string;
    created_at: Date;
    is_verified: boolean;
  }) {
    const { data, error } = await this.supabase
      .from('users')
      .insert([user])
      .select()
      .single();

    if (error) throw new Error(`Supabase createUser error: ${error.message}`);
    return data;
  }

  async findUserByEmail(email: string) {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error) throw new Error(`Supabase findUserByEmail error: ${error.message}`);
    return data;
  }

  async updateUserVerification(userId: string, isVerified: boolean) {
    const { data, error } = await this.supabase
      .from('users')
      .update({ is_verified: isVerified })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new Error(`Supabase updateUserVerification error: ${error.message}`);
    return data;
  }
}