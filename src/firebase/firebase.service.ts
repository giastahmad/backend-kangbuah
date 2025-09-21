// src/firebase/firebase.service.ts
import { Injectable, HttpException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import axios from 'axios';

@Injectable()
export class FirebaseService {
  private firebaseAuth = admin.auth();
  private readonly apiKey = process.env.FIREBASE_API_KEY;

  async createUser(email: string, password: string) {
    return this.firebaseAuth.createUser({ email, password });
  }

  async generateEmailVerificationLink(email: string) {
    return this.firebaseAuth.generateEmailVerificationLink(email);
  }

  async verifyIdToken(token: string) {
    return this.firebaseAuth.verifyIdToken(token);
  }

  async signInWithEmailAndPassword(email: string, password: string) {
    try {
      const response = await axios.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${this.apiKey}`,
        { email, password, returnSecureToken: true },
      );

      return {
        uid: response.data.localId,
        email: response.data.email,
        idToken: response.data.idToken,
        emailVerified: response.data.emailVerified ?? false,
      };
    } catch (error) {
      throw new HttpException(
        error.response?.data?.error?.message || 'Login failed',
        401,
      );
    }
  }

  async verifyEmailOobCode(oobCode: string) {
    try {
      const url = `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${this.apiKey}`;
      const response = await axios.post(url, { oobCode });
      return response.data; // berisi email + info user
    } catch (error) {
      throw new HttpException(
        error.response?.data?.error?.message || 'Verify email failed',
        400,
      );
    }
  }
}
