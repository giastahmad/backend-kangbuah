import { Injectable, UnauthorizedException,  HttpException, HttpStatus, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as admin from 'firebase-admin';
import { User } from '../users/entities/user.entity';
import * as bcrypt from 'bcryptjs';

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
  private readonly jwtRefreshSecret: string;

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

    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    if (!refreshSecret) {
      throw new Error('JWT_REFRESH_SECRET tidak ditemukan di .env');
    }
    this.jwtRefreshSecret = refreshSecret;
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

      return this.generateTokens(user);
    } catch (error) {
      throw new UnauthorizedException('Terjadi masalah saat memproses login.');
    }
  }

  async generateTokens(user: User) {
    const payload = {
      sub: user.user_id,
      role: user.role,
      username: user.username,
      email: user.email,
    };
    const accessToken = this.jwtService.sign(payload);

    const refreshToken = this.jwtService.sign(
      { sub: user.user_id },
      {
        secret: this.jwtRefreshSecret,
        expiresIn: '3h',
      },
    );

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.usersRepository.update(
      { user_id: user.user_id },
      { hashed_refresh_token: hashedRefreshToken },
    );

    return { accessToken, refreshToken };
  }

  async findUserById(id: string){
    return await this.usersRepository.findOneBy({user_id: id})
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.usersRepository.findOneBy({ user_id: userId });
    
    if (!user || !user.hashed_refresh_token) {
      throw new ForbiddenException('Akses Ditolak (User/Token tidak ada)');
    }

    const isTokenMatch = await bcrypt.compare(
      refreshToken,
      user.hashed_refresh_token,
    );

    if (!isTokenMatch) {
      await this.logout(user.user_id); 
      throw new ForbiddenException('Akses Ditolak (Token tidak cocok)');
    }

    const tokens = await this.generateTokens(user);
    return tokens;
  }

  async logout(userId: string) {
    return this.usersRepository.update(
      { user_id: userId },
      { hashed_refresh_token: null },
    );
  }
}