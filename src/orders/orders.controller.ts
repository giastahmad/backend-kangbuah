import { Controller, Get, Post, Param, Body, Patch } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrderStatus } from './entities/order.entity';


@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}


  @Get('form/:userId')
  getUserForm(@Param('userId') userId: string) {
    return this.ordersService.getUserForm(userId);
  }

  @Post('create/:userId')
  createOrder(
    @Param('userId') userId: string,
    @Body('products') products: { product_id: string; quantity: number }[],
    @Body('formData') formData: any,
  ) {
    return this.ordersService.createOrder(userId, products, formData);
  }

  @Get('total/:orderId')
  getTotal(@Param('orderId') orderId: string) {
    return this.ordersService.getTotalOrderPrice(orderId);
  }

  @Patch('approve/:orderId')
  approveOrder(@Param('orderId') orderId: string) {
    return this.ordersService.approveOrder(orderId);
  }

  @Patch('status/:orderId')
  updateStatus(
    @Param('orderId') orderId: string,
    @Body('status') status: OrderStatus,
  ) {
    return this.ordersService.updateOrderStatus(orderId, status);
  }

  @Get('list')
  getAllOrders() {
    return this.ordersService.getAllOrders();
  }

  @Get('history/:userId')
  getUserOrders(@Param('userId') userId: string) {
    return this.ordersService.getUserOrders(userId);
  }
}
