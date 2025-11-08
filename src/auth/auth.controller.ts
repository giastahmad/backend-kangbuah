import {
  Controller,
  Res,
  HttpCode,
  HttpStatus,
  Post,
  Body,
  BadRequestException,
  Get,
  Request,
  UseGuards,
  ConflictException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcryptjs';
import { FirebaseService } from '../firebase/firebase.service';
import { SupabaseService } from '../supabase/supabase.service';
import { JwtAuthGuard } from './auth-guards/jwt-auth.guard';
import { UserRole } from 'src/users/entities/user.entity';
import { MailService } from 'src/mail/mailer.service';
import express from 'express';
import { JwtRefreshGuard } from './auth-guards/jwt-refresh.guard';
import { AuthService } from './auth.service';
import * as dotenv from 'dotenv';

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
  company_name?: string;
  npwp?: string;
  phone_number?: string;
  created_at: Date;
  is_verified: boolean;
}

const isProduction = process.env.NODE_ENV === 'production';

const cookieOptions: express.CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  path: '/',
  sameSite: isProduction ? 'strict' : 'lax',
};

@Controller('auth')
export class AuthController {
  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly supabaseService: SupabaseService,
    private readonly authService: AuthService,
    private readonly mailService: MailService,
  ) {}

  @Post('google/login')
  @HttpCode(HttpStatus.OK)
  async loginWithGoogle(
    @Body('token') token: string,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const tokens = await this.authService.loginWithGoogle(token);

    res.cookie('refresh_token', tokens.refreshToken, {
      ...cookieOptions,
      maxAge: 3 * 60 * 60 * 1000,
    });

    return {
      accessToken: tokens.accessToken,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  @Post('register')
  async register(@Body() body: any) {
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
      throw new BadRequestException('Email tidak valid');
    if (!password || password.length < 6)
      throw new BadRequestException('Password minimal 6 karakter');
    if (password !== confirmPassword)
      throw new BadRequestException('Konfirmasi password tidak sama');

    const existing = await this.supabaseService.findUserByEmail(email);
    if (existing) throw new ConflictException('Email sudah terdaftar');

    const fbUser = await this.firebaseService.createUser(email, password);

    await this.firebaseService.sendVerificationEmail(email);

    const hashed = await bcrypt.hash(password, 10);
    const newUser = await this.supabaseService.createUser({
      user_id: fbUser.uid,
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
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: { email: string; password: string },
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const { email, password } = body;

    const fbUser = await this.firebaseService.signInWithEmailAndPassword(
      email,
      password,
    );

    const dbUser = await this.supabaseService.findUserByEmail(email);

    if (!dbUser) {
      throw new BadRequestException('User tidak ditemukan di database');
    }

    const userForToken = await this.authService.findUserById(fbUser.uid);
    if (!userForToken) {
      throw new BadRequestException('User tidak sinkron');
    }

    await this.supabaseService.updateUserVerification(dbUser.user_id, true);

    const tokens = await this.authService.generateTokens(dbUser);

    res.cookie('refresh_token', tokens.refreshToken, {
      ...cookieOptions,
      maxAge: 3 * 60 * 60 * 1000,
    });

    return {
      accessToken: tokens.accessToken,
    };
  }

  @Post('verify-email')
  async verifyEmail(@Body() body: { oobCode: string }) {
    const { oobCode } = body;
    if (!oobCode) throw new BadRequestException('oobCode wajib ada');

    const data = (await this.firebaseService.verifyEmailOobCode(oobCode)) as {
      email: string;
    };
    const dbUser = await this.supabaseService.findUserByEmail(data.email);
    if (!dbUser) throw new BadRequestException('User tidak ditemukan');

    if (!dbUser.is_verified) {
      await this.supabaseService.updateUserVerification(dbUser.user_id, true);
    }

    return { message: 'Email diverifikasi', email: data.email };
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
    await this.firebaseService.sendVerificationEmail(email);

    return {
      message:
        'Email verifikasi baru telah berhasil dikirim. Silakan cek inbox dan folder spam Anda.',
    };
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    const { email } = body;
    if (!email) throw new BadRequestException('Email wajib diisi');
    const user = await this.supabaseService.findUserByEmail(email);
    if (!user) throw new BadRequestException('User tidak ditemukan');

    await this.firebaseService.sendPasswordResetEmail(email);
    return { message: 'Email reset password telah dikirim' };
  }

  @UseGuards(JwtRefreshGuard)
  @Get('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Request() req,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const userId = req.user.userId;
    const refreshToken = req.user.refreshToken;

    const tokens = await this.authService.refreshTokens(userId, refreshToken);

    res.cookie('refresh_token', tokens.refreshToken, {
      ...cookieOptions,
      maxAge: 3 * 60 * 60 * 1000,
    });

    return {
      accessToken: tokens.accessToken,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Request() req,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    await this.authService.logout(req.user.userId);

    res.clearCookie('refresh_token', cookieOptions);

    return { message: 'Logout berhasil' };
  }
}
