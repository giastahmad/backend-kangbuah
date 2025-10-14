import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { Repository } from 'typeorm';
import { OrderDetail } from './entities/orderDetail.entity';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { v4 as uuidv4 } from 'uuid';
import { Address, AddressesType } from '../users/entities/address.entity';
import { format } from 'date-fns';

@Injectable()
export class OrdersService {
    constructor(
        @InjectRepository(Order)
        private ordersRepository: Repository<Order>,
        @InjectRepository(Order) private orderRepo: Repository<Order>,
        @InjectRepository(OrderDetail) private orderDetailRepo: Repository<OrderDetail>,
        @InjectRepository(Product) private productRepo: Repository<Product>,
        @InjectRepository(User) private userRepo: Repository<User>,
        @InjectRepository(Address) private readonly addressRepo: Repository<Address>,
    ){}

    async updateAttachmentUrl(orderId: string, url: string){

        const order = await this.ordersRepository.findOneBy({order_id: orderId})

        if(!order){
            throw new NotFoundException(`Order dengan ID ${orderId} tidak ditemukan`)
        }

        order.attachment_url = url

        return this.ordersRepository.save(order);
    }

  async getUserForm(userId: string) {
    const user = await this.userRepo.findOne({ where: { user_id: userId } });
    if (!user) throw new NotFoundException('User tidak ditemukan');

    const lastAddress = await this.addressRepo.findOne({
      where: {
        user_id: userId,
        type: AddressesType.DELIVERY,
      },
      order: { address_id: 'DESC' }, 
    });

    return {
      npwp: user.npwp ?? null,
      company_name: user.company_name ?? null,
      phone_number: user.phone_number ?? null,
      delivery_address: lastAddress
        ? {
            street: lastAddress.street,
            city: lastAddress.city,
            province: lastAddress.province,
            postal_code: lastAddress.postal_code,
            pic_name: lastAddress.pic_name,
            address_id: lastAddress.address_id,
          }
        : null,
    };
  }

  async createOrder(
    userId: string,
    products: { product_id: string; quantity: number }[],
    formData?: any,
  ) {
    const user = await this.userRepo.findOne({ where: { user_id: userId } });
    if (!user) throw new NotFoundException('User tidak ditemukan');

    if (formData) {
      const allowedUserFields = ['company_name', 'npwp', 'phone_number'];
      for (const field of allowedUserFields) {
        if (formData[field] !== undefined) user[field] = formData[field];
      }
      await this.userRepo.save(user);
    }

    let deliveryAddressId = formData?.delivery_address_id;

    if (!deliveryAddressId) {
      const addressData = formData?.delivery_address;
      if (!addressData) {
        throw new BadRequestException(
          'Jika tidak mengirim delivery_address_id, maka delivery_address harus diisi.'
        );
      }

      const existingAddress = await this.addressRepo.findOne({
        where: {
          user_id: user.user_id,
          street: addressData.street,
          city: addressData.city,
          province: addressData.province,
          postal_code: addressData.postal_code,
          type: AddressesType.DELIVERY,
        },
      });

      if (existingAddress) {
        deliveryAddressId = existingAddress.address_id;
      } else {
        const newAddress = this.addressRepo.create({
          address_id: uuidv4(),
          user_id: user.user_id,
          type: AddressesType.DELIVERY,
          street: addressData.street,
          city: addressData.city,
          province: addressData.province,
          postal_code: addressData.postal_code,
          pic_name: addressData.pic_name ?? user.username ?? 'Default',
        });

        const savedAddress = await this.addressRepo.save(newAddress);
        deliveryAddressId = savedAddress.address_id;
      }
    }

    const order = this.orderRepo.create({
      order_id: uuidv4(),
      user_id: userId,
      delivery_address_id: deliveryAddressId,
      order_date: new Date(),
      total_price: 0,
      status: OrderStatus.MENUNGGU_PERSETUJUAN,
    });

    await this.orderRepo.save(order);

    let totalPrice = 0;
    const orderDetails: OrderDetail[] = [];

    for (const item of products) {
      const product = await this.productRepo.findOne({ where: { product_id: item.product_id } });
      if (!product) throw new NotFoundException(`Produk ${item.product_id} tidak ditemukan`);
      if (product.stock < item.quantity)
        throw new BadRequestException(`Stok produk ${product.name} tidak mencukupi`);

      const subtotal = Number(product.price) * item.quantity;
      totalPrice += subtotal;

      product.stock -= item.quantity;
      await this.productRepo.save(product);

      const detail = this.orderDetailRepo.create({
        order_detail_id: uuidv4(),
        order_id: order.order_id,
        product_id: product.product_id,
        quantity: item.quantity,
        price_per_unit: product.price,
      });

      orderDetails.push(detail);
    }

    await this.orderDetailRepo.save(orderDetails);

    order.total_price = totalPrice;
    await this.orderRepo.save(order);

    return {
      message: 'Pesanan berhasil dibuat',
      order,
      orderDetails,
    };
  }

  async getTotalOrderPrice(orderId: string) {
    const order = await this.orderRepo.findOne({ where: { order_id: orderId } });
    if (!order) throw new NotFoundException('Pesanan tidak ditemukan');
    return { order_id: order.order_id, total_price: order.total_price };
  }

  async approveOrder(orderId: string) {
    const order = await this.orderRepo.findOne({ where: { order_id: orderId } });
    if (!order) throw new NotFoundException('Pesanan tidak ditemukan');
    order.status = OrderStatus.MENUNGGU_PEMBAYARAN;
    return this.orderRepo.save(order);
  }

  async updateOrderStatus(orderId: string, status: OrderStatus) {
    const order = await this.orderRepo.findOne({ where: { order_id: orderId } });
    if (!order) throw new NotFoundException('Pesanan tidak ditemukan');

    order.status = status;

    // 🔹 Jika status berubah ke DALAM_PENGIRIMAN, isi otomatis tanggal & waktu sekarang
    if (status === OrderStatus.DALAM_PENGIRIMAN) {
      const now = new Date();
      order.delivery_date = now;
      order.delivery_time = format(now, 'HH:mm'); // contoh: "10:35"
    }

    return this.orderRepo.save(order);
  }

    async getAllOrders() {
      return this.orderRepo.find({
        relations: ['user', 'order_details', 'order_details.product'],
        order: { order_date: 'DESC' },
      });
    }

  async getUserOrders(userId: string) {
    return this.orderRepo.find({
      where: { user_id: userId },
      relations: ['order_details', 'order_details.product'],
      order: { order_date: 'DESC' },
    });
  }
}
