import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { Address } from './entities/address.entity';

@Module({
    imports: [TypeOrmModule.forFeature([User, Address])],
    exports: [TypeOrmModule, UsersService],
    controllers: [UsersController],
    providers: [UsersService],
})
export class UsersModule {}
