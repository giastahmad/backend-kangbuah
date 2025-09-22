// src/firebase/firebase.service.ts
import { Injectable, HttpException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import axios from 'axios';

@Injectable()
export class FirebaseService {
  private readonly apiKey = process.env.FIREBASE_API_KEY;
  private firebaseAuth: admin.auth.Auth;

  constructor() {
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }
    this.firebaseAuth = admin.auth();
  }

  // ========== REGISTER / LOGIN ==========
  async createUser(email: string, password: string) {
    return this.firebaseAuth.createUser({ email, password });
  }

  async signInWithEmailAndPassword(email: string, password: string) {
    try {
      const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${this.apiKey}`;
      const { data } = await axios.post(url, {
        email,
        password,
        returnSecureToken: true,
      });

      return {
        uid: data.localId,
        email: data.email,
        idToken: data.idToken,
        refreshToken: data.refreshToken,
        emailVerified: data.emailVerified ?? false,
      };
    } catch (error) {
      throw new HttpException(
        error.response?.data?.error?.message || 'Login failed',
        401,
      );
    }
  }

  // ========== VERIFIKASI EMAIL ==========
  async generateEmailVerificationLink(email: string) {
    return this.firebaseAuth.generateEmailVerificationLink(email);
  }

  async verifyEmailOobCode(oobCode: string) {
    try {
      const url = `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${this.apiKey}`;
      const { data } = await axios.post(url, { oobCode });
      return data; // berisi email + info user
    } catch (error) {
      throw new HttpException(
        error.response?.data?.error?.message || 'Verify email failed',
        400,
      );
    }
  }

  // ========== FORGOT PASSWORD ==========
  async generatePasswordResetLink(email: string) {
    try {
      return await this.firebaseAuth.generatePasswordResetLink(email);
    } catch (error) {
      throw new HttpException(
        error.message || 'Generate reset link failed',
        400,
      );
    }
  }

  async confirmPasswordReset(oobCode: string, newPassword: string) {
    try {
      const url = `https://identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=${this.apiKey}`;
      const { data } = await axios.post(url, { oobCode, newPassword });
      return data; // data.email bisa dipakai
    } catch (error) {
      throw new HttpException(
        error.response?.data?.error?.message || 'Reset password failed',
        400,
      );
    }
  }

  // ========== TOKEN ==========
  async verifyIdToken(token: string) {
    return this.firebaseAuth.verifyIdToken(token);
  }
}
