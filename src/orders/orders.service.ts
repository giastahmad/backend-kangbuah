import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { Repository } from 'typeorm';

@Injectable()
export class OrdersService {
    constructor(
        @InjectRepository(Order)
        private ordersRepository: Repository<Order>
    ){}

    async updateAttachmentUrl(orderId: string, url: string){

        const order = await this.ordersRepository.findOneBy({order_id: orderId})

        if(!order){
            throw new NotFoundException(`Order dengan ID ${orderId} tidak ditemukan`)
        }

        order.attachment_url = url

        return this.ordersRepository.save(order);
    }
}
