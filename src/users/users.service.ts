import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
    ) {}

    async findAllUsers(): Promise<Partial<User[]>>{
        try{
            return this.usersRepository.find({
                select: {
                    user_id: true,
                    username: true,
                    email: true,
                    role: true,
                    company_name: true,
                    npwp: true,
                    phone_number: true,
                }
            })
        } catch (error) {
            throw new error('Gagal mendapat data users')
        }
    }
}
