import { Controller, Get, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from 'src/auth/auth-guards/jwt-auth.guard';
import { RoleGuard } from '../auth/auth-guards/role.guard';
import { Roles } from 'src/auth/decorators/role.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('ADMIN')
  @Get()
  getAllUsers() {
    return this.usersService.findAllUsers();
  }
}
