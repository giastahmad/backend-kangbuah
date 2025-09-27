// src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  BadRequestException,
  Get,
  Request,
  UseGuards,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { FirebaseService } from '../firebase/firebase.service';
import { SupabaseService } from '../supabase/supabase.service';
import { JwtAuthGuard } from './auth-guards/jwt-auth.guard'; // Buat guard ini
import { UserRole } from 'src/users/entities/user.entity';

interface FirebaseUser {
  uid: string;
  email?: string;
  emailVerified?: boolean;
}

interface DatabaseUser {
  user_id: string;
  email: string;
  username: string;
  password: string;
  role: UserRole;
  company_name: string;
  npwp: string;
  phone_number: string;
  created_at: Date;
  is_verified: boolean;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly firebaseService: FirebaseService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Post('google/login')
  loginWithGoogle(@Body('token') token: string) {
    return this.authService.loginWithGoogle(token);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

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
    const {
      email,
      password,
      confirmPassword,
      username,
      company_name,
      npwp,
      phone_number,
    } = body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email))
      throw new BadRequestException('Format email tidak valid');
    if (!password || password.length < 6)
      throw new BadRequestException('Password minimal 6 karakter');
    if (password !== confirmPassword)
      throw new BadRequestException('Konfirmasi password tidak sama');

    const fbUser: FirebaseUser = await this.firebaseService.createUser(
      email,
      password,
    );
    try {
      console.log(`Mencoba membuat link verifikasi untuk: ${email}`);
    const verificationLink =
      await this.firebaseService.generateEmailVerificationLink(email);
    console.log(`✅ Link berhasil dibuat oleh Firebase.`);

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await this.supabaseService.createUser({
      user_id: fbUser.uid,
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
    } catch (error) {
      console.error('❌ GAGAL saat memanggil generateEmailVerificationLink:', error); 
    }
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const { email, password } = body;

    const fbUser: { emailVerified: boolean } =
      await this.authService.signInWithEmailAndPassword(email, password);
    const dbUser: DatabaseUser =
      await this.supabaseService.findUserByEmail(email);

    if (!dbUser)
      throw new BadRequestException('User tidak ditemukan di database');

    if (fbUser.emailVerified && !dbUser.is_verified) {
      await this.supabaseService.updateUserVerification(dbUser.user_id, true);
      dbUser.is_verified = true; // update object lokal
    }

    if (!dbUser.is_verified) {
      throw new BadRequestException(
        'Email belum diverifikasi. Silakan cek inbox Anda.',
      );
    }

    const { accessToken } = this.authService.generateCustomJwt(dbUser);

    return {
      accessToken: accessToken,
      is_verified: dbUser.is_verified,
    };
  }

  @Post('verify-email')
  async verifyEmail(@Body() body: { oobCode: string }) {
    const { oobCode } = body;
    if (!oobCode) throw new BadRequestException('oobCode wajib ada');

    const fbUser = (await this.firebaseService.verifyEmailOobCode(oobCode)) as {
      email?: string;
    };
    if (!fbUser.email) {
      throw new BadRequestException('Gagal verifikasi email');
    }

    const dbUser = await this.supabaseService.findUserByEmail(fbUser.email);
    if (!dbUser)
      throw new BadRequestException('User tidak ditemukan di database');

    if (!dbUser.is_verified) {
      await this.supabaseService.updateUserVerification(dbUser.user_id, true);
    }

    return {
      message: 'Email berhasil diverifikasi',
      email: fbUser.email,
      is_verified: true,
    };
  }

  @Post('verify-email/resend')
  async resendVerificationEmail(@Body() body: { email: string }) {
    const { email } = body;
    if (!email) throw new BadRequestException('Email wajib diisi');

    // 1. Cek apakah user ada di database Anda
    const dbUser = await this.supabaseService.findUserByEmail(email);
    if (!dbUser) {
      // Kita kirim pesan sukses umum untuk alasan keamanan, agar orang
      // tidak bisa menebak-nebak email mana yang terdaftar.
      return {
        message:
          'Jika email Anda terdaftar, link verifikasi baru telah dikirim.',
      };
    }

    // 2. Cek apakah user tersebut memang belum terverifikasi
    if (dbUser.is_verified) {
      return { message: 'Email ini sudah terverifikasi sebelumnya.' };
    }

    // 3. Jika user ada dan belum diverifikasi, buat link verifikasi BARU
    // Firebase akan otomatis mengirimkannya ke email tersebut
    await this.firebaseService.generateEmailVerificationLink(email);

    return {
      message:
        'Email verifikasi baru telah berhasil dikirim. Silakan cek inbox dan folder spam Anda.',
    };
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    const { email } = body;
    if (!email) throw new BadRequestException('Email wajib diisi');

    // cek user di Supabase
    const dbUser = await this.supabaseService.findUserByEmail(email);
    if (!dbUser) throw new BadRequestException('User tidak ditemukan');

    // generate reset link dari Firebase
    const resetLink =
      await this.firebaseService.generatePasswordResetLink(email);

    // opsional: simpan ke logs Supabase / kirim custom email
    return {
      message: 'Password reset link berhasil dibuat',
      resetLink,
    };
  }
  @Post('reset-password')
  async resetPassword(@Body() body: { oobCode: string; newPassword: string }) {
    const { oobCode, newPassword } = body;
    if (!oobCode || !newPassword)
      throw new BadRequestException('oobCode dan password baru wajib diisi');

    // verifikasi OOB code & set password baru
    const fbUser = (await this.firebaseService.confirmPasswordReset(
      oobCode,
      newPassword,
    )) as { email?: String };

    if (!fbUser?.email) throw new BadRequestException('Gagal reset password');

    return {
      message: 'Password berhasil direset',
      email: fbUser.email,
    };
  }
}
