import { Injectable, HttpException, InternalServerErrorException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import axios from 'axios';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class FirebaseService {
  private readonly apiKey = process.env.FIREBASE_API_KEY;
  private firebaseAuth: admin.auth.Auth;
  private transporter: nodemailer.Transporter;

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
  ) {
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }
    this.firebaseAuth = admin.auth();

    // Transporter Gmail
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS, // Gunakan App Password
      },
    });
  }

  // Buat akun Firebase
  async createUser(email: string, password: string) {
    return this.firebaseAuth.createUser({ email, password });
  }

  // Kirim email verifikasi
  async sendVerificationEmail(email: string) {
    try {
      const link = await this.firebaseAuth.generateEmailVerificationLink(email);

      await this.transporter.sendMail({
        from: `"KangBuah App" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Verifikasi Email Anda',
        html: `
          <p>Halo,</p>
          <p>Klik link berikut untuk verifikasi akun Anda:</p>
          <p><a href="${link}" target="_blank">${link}</a></p>
        `,
      });

      console.log(`✅ Verification email sent to ${email}`);
      return link;
    } catch (error) {
      console.error('❌ Gagal kirim email verifikasi:', error);
      throw new InternalServerErrorException('Gagal kirim email verifikasi');
    }
  }

  // Login Firebase
  async signInWithEmailAndPassword(email: string, password: string) {
    try {
      const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${this.apiKey}`;
      const { data } = await axios.post(url, { email, password, returnSecureToken: true });
      return {
        uid: data.localId,
        email: data.email,
        idToken: data.idToken,
        refreshToken: data.refreshToken,
        emailVerified: data.emailVerified ?? false,
      };
    } catch (error) {
      throw new HttpException(
        error.response?.data?.error?.message || 'Login gagal',
        401,
      );
    }
  }

  // Verifikasi email pakai oobCode
  async verifyEmailOobCode(oobCode: string) {
    try {
      const url = `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${this.apiKey}`;
      const { data } = await axios.post(url, { oobCode });
      return data;
    } catch (error) {
      throw new HttpException(
        error.response?.data?.error?.message || 'Gagal verifikasi email',
        400,
      );
    }
  }

  // Generate link reset password
  async generatePasswordResetLink(email: string) {
    return this.firebaseAuth.generatePasswordResetLink(email);
  }

  async confirmPasswordReset(oobCode: string, newPassword: string) {
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=${this.apiKey}`;
    const { data } = await axios.post(url, { oobCode, newPassword });
    return data;
  }

  async verifyIdToken(token: string) {
    return this.firebaseAuth.verifyIdToken(token);
  }
}
