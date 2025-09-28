// src/chat/chat.controller.ts
import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('create-room')
  async createRoom(@Body() body: { customerId: string; adminId: string }) {
    return this.chatService.createRoom(body.customerId, body.adminId);
  }

  @Post('send')
  async sendMessage(
    @Body() body: { roomId: string; senderId: string; message: string },
  ) {
    return this.chatService.sendMessage(
      body.roomId,
      body.senderId,
      body.message,
    );
  }

  @Get('messages/:roomId')
  async getMessages(@Param('roomId') roomId: string) {
    return this.chatService.getMessages(roomId);
  }

  @Get('list/:adminId')
  async listCustomerChats(@Param('adminId') adminId: string) {
    return this.chatService.listCustomerChats(adminId);
  }
}