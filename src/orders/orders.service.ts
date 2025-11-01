import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { Repository } from 'typeorm';
import { OrderDetail } from './entities/orderDetail.entity';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { v4 as uuidv4 } from 'uuid';
import { Address, AddressesType } from '../users/entities/address.entity';
import { format } from 'date-fns';
import { ProductsService } from 'src/products/products.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(OrderDetail)
    private orderDetailRepo: Repository<OrderDetail>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Address)
    private readonly addressRepo: Repository<Address>,
    private readonly productsService: ProductsService,
  ) {}

  async updateAttachmentUrl(orderId: string, url: string) {
    const order = await this.ordersRepository.findOneBy({ order_id: orderId });

    if (!order) {
      throw new NotFoundException(`Order dengan ID ${orderId} tidak ditemukan`);
    }

    order.attachment_url = url;

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

    let firstName = '';
    let lastName = '';

    if (lastAddress && lastAddress.pic_name) {
      const nameParts = lastAddress.pic_name.split(' ');
      firstName = nameParts.shift() || '';
      lastName = nameParts.join(' ');
    }

    return {
      npwp: user.npwp ?? null,
      company_name: user.company_name ?? null,
      phone_number: user.phone_number ?? null,
      first_name: firstName,
      last_name: lastName,
      delivery_address: lastAddress
        ? {
            street: lastAddress.street,
            ward: lastAddress.ward,
            city: lastAddress.city,
            province: lastAddress.province,
            postal_code: lastAddress.postal_code,
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

    let poNumber = formData?.po_number;
    if (!poNumber) {
      const timestamp = Date.now().toString().slice(-6);
      poNumber = `PO-${userId.slice(0, 4).toUpperCase()}-${timestamp}`;
    }

    let deliveryAddressId: string;
    const addressData = formData?.delivery_address;

    if (!addressData) {
      throw new BadRequestException('Data delivery_address harus diisi.');
    }

    const lastDeliveryAddress = await this.addressRepo.findOne({
      where: {
        user_id: user.user_id,
        type: AddressesType.DELIVERY,
      },
      order: { address_id: 'DESC' },
    });
    if (lastDeliveryAddress) {
      lastDeliveryAddress.street = addressData.street;
      lastDeliveryAddress.ward = addressData.ward;
      lastDeliveryAddress.city = addressData.city;
      lastDeliveryAddress.province = addressData.province;
      lastDeliveryAddress.postal_code = addressData.postal_code;
      lastDeliveryAddress.pic_name =
        addressData.pic_name ?? user.username ?? 'Default';

      const savedAddress = await this.addressRepo.save(lastDeliveryAddress);
      deliveryAddressId = savedAddress.address_id;
    } else {
      const newAddress = this.addressRepo.create({
        address_id: uuidv4(),
        user_id: user.user_id,
        type: AddressesType.DELIVERY,
        street: addressData.street,
        ward: addressData.ward,
        city: addressData.city,
        province: addressData.province,
        postal_code: addressData.postal_code,
        pic_name: addressData.pic_name ?? user.username ?? 'Default',
      });

      const savedAddress = await this.addressRepo.save(newAddress);
      deliveryAddressId = savedAddress.address_id;
    }

    // 🔹 Tambahkan po_number ke dalam order
    const order = this.orderRepo.create({
      order_id: uuidv4(),
      user_id: userId,
      po_number: poNumber,
      delivery_address_id: deliveryAddressId,
      order_date: new Date(),
      total_price: 0,
      status: OrderStatus.SEDANG_DIPROSES,
      payment_method: formData.payment_method,
      delivery_pic_name: addressData.pic_name,
      delivery_street: addressData.street,
      delivery_city: addressData.city,
      delivery_ward: addressData.ward,
      delivery_province: addressData.province,
      delivery_postal_code: addressData.postal_code,
      billing_company_name: user.company_name,
      billing_phone_number: user.phone_number
    });

    await this.orderRepo.save(order);

    let totalPrice = 0;
    const orderDetails: OrderDetail[] = [];

    for (const item of products) {
      const updatedProduct = await this.productsService.updateStock(
        item.product_id,
        item.quantity,
      );

      const subtotal = Number(updatedProduct.price) * item.quantity;
      totalPrice += subtotal;

      const detail = this.orderDetailRepo.create({
        order_detail_id: uuidv4(),
        order_id: order.order_id,
        product_id: updatedProduct.product_id,
        quantity: item.quantity,
        price_per_unit: updatedProduct.price,
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
    const order = await this.orderRepo.findOne({
      where: { order_id: orderId },
    });
    if (!order) throw new NotFoundException('Pesanan tidak ditemukan');
    return { order_id: order.order_id, total_price: order.total_price };
  }

  async approveOrder(orderId: string) {
    const order = await this.orderRepo.findOne({
      where: { order_id: orderId },
    });
    if (!order) throw new NotFoundException('Pesanan tidak ditemukan');
    order.status = OrderStatus.MENUNGGU_PEMBAYARAN;
    return this.orderRepo.save(order);
  }

  async updateOrderStatus(orderId: string, status: OrderStatus) {
    const order = await this.orderRepo.findOne({
      where: { order_id: orderId },
    });
    if (!order) throw new NotFoundException('Pesanan tidak ditemukan');

    order.status = status;

    if (status === OrderStatus.DALAM_PENGIRIMAN) {
      const now = new Date();
      order.delivery_date = now;
      order.delivery_time = format(now, 'HH:mm');
    }

    return this.orderRepo.save(order);
  }

  async getAllOrders() {
    return this.orderRepo.find({
      relations: ['user', 'order_details', 'order_details.product'],
      order: { order_date: 'DESC' },
    });
  }

  async getOrderById(orderId: string) {
    const order = await this.orderRepo.findOne({
      where: { order_id: orderId },
      relations: ['order_details', 'order_details.product'],
    });

    if (!order) {
      throw new NotFoundException(`Order dengan ID ${orderId} tidak ditemukan`);
    }

    return order;
  }

  async getUserOrders(userId: string) {
    return this.orderRepo.find({
      where: { user_id: userId },
      relations: ['order_details', 'order_details.product', 'delivery_address'],
      order: { order_date: 'DESC' },
    });
  }
}
