import { Injectable, UnauthorizedException,  HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as admin from 'firebase-admin';
import { User } from '../users/entities/user.entity';

interface FirebaseSignInResponse {
  localId: string;
  email: string;
  idToken: string;
  refreshToken: string;
  emailVerified: boolean;
}

@Injectable()
export class AuthService {
  private readonly apiKey: String;

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
   const key = this.configService.get<string>('FIREBASE_API_KEY');
    if (!key) {
      throw new Error('FIREBASE_API_KEY tidak ditemukan di .env');
    }
    this.apiKey = key;
  }

  async loginWithGoogle(token: string) {
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      const { uid, email, name } = decodedToken;
      let user = await this.usersRepository.findOneBy({ user_id: uid });

      if (!user) {
        const newUser = this.usersRepository.create({
          user_id: uid,
          email: email,
          username: name,
          password: 'managed_by_firebase',
          is_verified: decodedToken.email_verified || true,
        });
        user = await this.usersRepository.save(newUser);
      }

      return this.generateCustomJwt(user);
    } catch (error) {
      // Tampilkan error yang lebih detail untuk debugging
      console.error('Error detail:', error);

      throw new UnauthorizedException('Terjadi masalah saat memproses login.');
    }
  }

  public generateCustomJwt(user: User) {
    const payload = {
      sub: user.user_id,
      role: user.role,
      username: user.username,
      email: user.email,
    };
    const accessToken = this.jwtService.sign(payload);
    return { accessToken };
  }

  async findUserById(id: string){
    return await this.usersRepository.findOneBy({user_id: id})
  }
}