// src/auth/auth.controller.ts
import { Controller, Post, Body, Get, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './auth-guards/jwt-auth.guard'; // Buat guard ini

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('google/login')
  loginWithGoogle(@Body('token') token: string) {
    return this.authService.loginWithGoogle(token);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }
}