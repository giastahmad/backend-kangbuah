import { Controller, Get, Post, Param, Body, Patch, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrderStatus } from './entities/order.entity';
import { JwtAuthGuard } from 'src/auth/auth-guards/jwt-auth.guard';


@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}


  @Get('list')
  getAllOrders() {
    return this.ordersService.getAllOrders();
  }

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

  @Get(':orderId')
  @UseGuards(JwtAuthGuard)
  getOrderById(
    @Param('orderId') orderId: string
  ){
    return this.ordersService.getOrderById(orderId);
  }

  @Get('history/:userId')
  getUserOrders(@Param('userId') userId: string) {
    return this.ordersService.getUserOrders(userId);
  }
}
