import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // Customer kirim pesan → otomatis ke semua admin
  @Post('create-room')
  async createRoom(@Body() body: { customerId: string }) {
    return this.chatService.createRoom(body.customerId);
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

  // Admin list semua customer
  @Get('list/:adminId')
  async listCustomerChats(@Param('adminId') adminId: string) {
    return this.chatService.listCustomerChats(adminId);
  }
}
