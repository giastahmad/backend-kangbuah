// src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { FirebaseService } from '../firebase/firebase.service';
import { SupabaseService } from '../supabase/supabase.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly firebaseService: FirebaseService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Post('register')
  async register(
    @Body()
    body: {
      email: string;
      password: string;
      confirmPassword: string;
      username?: string;
      company_name?: string;
      npwp?: string;
      phone_number?: string;
    },
  ) {
    const { email, password, confirmPassword, username, company_name, npwp, phone_number } = body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) throw new BadRequestException('Format email tidak valid');
    if (!password || password.length < 6) throw new BadRequestException('Password minimal 6 karakter');
    if (password !== confirmPassword) throw new BadRequestException('Konfirmasi password tidak sama');

    const fbUser = await this.firebaseService.createUser(email, password);
    const verificationLink = await this.firebaseService.generateEmailVerificationLink(email);

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await this.supabaseService.createUser({
      user_id: uuidv4(),
      username: username || email.split('@')[0],
      email,
      password: hashedPassword,
      role: 'CUSTOMER',
      company_name,
      npwp,
      phone_number,
      created_at: new Date(),
      is_verified: false,
    });

    return {
      message: 'User created, verification email sent',
      firebaseUid: fbUser.uid,
      verificationLink,
      user: newUser,
    };
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const { email, password } = body;

    const fbUser = await this.firebaseService.signInWithEmailAndPassword(email, password);

    const dbUser = await this.supabaseService.findUserByEmail(email);
    if (!dbUser) throw new BadRequestException('User tidak ditemukan di database');

    if (fbUser.emailVerified && !dbUser.is_verified) {
      await this.supabaseService.updateUserVerification(dbUser.user_id, true);
      dbUser.is_verified = true; // update object lokal
    }

    return {
      message: 'Login successful',
      firebaseUid: fbUser.uid,
      email: fbUser.email,
      idToken: fbUser.idToken,
      role: dbUser.role,
      is_verified: dbUser.is_verified,
    };
  }

  @Post('verify-email')
  async verifyEmail(@Body() body: { oobCode: string }) {
    const { oobCode } = body;
    if (!oobCode) throw new BadRequestException('oobCode wajib ada');

    const fbUser = await this.firebaseService.verifyEmailOobCode(oobCode);
    if (!fbUser.email) {
      throw new BadRequestException('Gagal verifikasi email');
    }

    const dbUser = await this.supabaseService.findUserByEmail(fbUser.email);
    if (!dbUser) throw new BadRequestException('User tidak ditemukan di database');

    if (!dbUser.is_verified) {
      await this.supabaseService.updateUserVerification(dbUser.user_id, true);
    }

    return {
      message: 'Email berhasil diverifikasi',
      email: fbUser.email,
      is_verified: true,
    };
  }
}
