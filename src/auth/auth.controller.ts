import {
  Controller,
  Post,
  Body,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcryptjs';
import { FirebaseService } from '../firebase/firebase.service';
import { SupabaseService } from '../supabase/supabase.service';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly supabaseService: SupabaseService,
    private readonly authService: AuthService,
  ) {}

  @Post('register')
  async register(@Body() body: any) {
    const { email, password, confirmPassword, username, company_name, npwp, phone_number } = body;

    // Validasi
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) throw new BadRequestException('Email tidak valid');
    if (!password || password.length < 6) throw new BadRequestException('Password minimal 6 karakter');
    if (password !== confirmPassword) throw new BadRequestException('Konfirmasi password tidak sama');

    // Cek Supabase
    const existing = await this.supabaseService.findUserByEmail(email);
    if (existing) throw new ConflictException('Email sudah terdaftar');

    // Buat akun Firebase
    const fbUser = await this.firebaseService.createUser(email, password);

    // Kirim email verifikasi
    await this.firebaseService.sendVerificationEmail(email);

    // Simpan ke Supabase
    const hashed = await bcrypt.hash(password, 10);
    const newUser = await this.supabaseService.createUser({
      user_id: uuidv4(),
      username: username || email.split('@')[0],
      email,
      password: hashed,
      role: 'CUSTOMER',
      company_name,
      npwp,
      phone_number,
      created_at: new Date(),
      is_verified: false,
    });

    return {
      message: 'User berhasil dibuat. Cek email untuk verifikasi.',
      firebaseUid: fbUser.uid,
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
    }

    return {
      message: 'Login berhasil',
      email: fbUser.email,
      is_verified: fbUser.emailVerified,
      token: fbUser.idToken,
    };
  }

  @Post('verify-email')
  async verifyEmail(@Body() body: { oobCode: string }) {
    const { oobCode } = body;
    if (!oobCode) throw new BadRequestException('oobCode wajib ada');

    const data = await this.firebaseService.verifyEmailOobCode(oobCode);
    const dbUser = await this.supabaseService.findUserByEmail(data.email);
    if (!dbUser) throw new BadRequestException('User tidak ditemukan');

    if (!dbUser.is_verified) {
      await this.supabaseService.updateUserVerification(dbUser.user_id, true);
    }

    return { message: 'Email diverifikasi', email: data.email };
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    const { email } = body;
    if (!email) throw new BadRequestException('Email wajib diisi');
    const user = await this.supabaseService.findUserByEmail(email);
    if (!user) throw new BadRequestException('User tidak ditemukan');

    const link = await this.firebaseService.generatePasswordResetLink(email);
    return { message: 'Link reset password dibuat', link };
  }

  @Post('reset-password')
  async resetPassword(@Body() body: { oobCode: string; newPassword: string }) {
    const { oobCode, newPassword } = body;
    const fbUser = await this.firebaseService.confirmPasswordReset(oobCode, newPassword);
    return { message: 'Password berhasil direset', email: fbUser.email };
  }
}
