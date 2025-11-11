import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { OrderDetail } from '../orders/entities/orderDetail.entity';
import { User } from '../users/entities/user.entity';
import { Product } from '../products/entities/product.entity';

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderDetail)
    private readonly orderDetailRepo: Repository<OrderDetail>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async getDashboardSummary() {
    const [
      totalOrders,
      totalRevenue,
      uniqueCustomers
    ] = await Promise.all([
      this.orderRepo.count(),
      this.orderRepo.sum('total_price'),
      this.orderRepo
        .createQueryBuilder('o')
        .select('COUNT(DISTINCT o.user_id)', 'count')
        .getRawOne(),
    ]);

    const avgOrderValue = totalOrders > 0 ? (totalRevenue ?? 0) / totalOrders : 0;

    return {
      total_orders: totalOrders,
      total_revenue: Number(totalRevenue) || 0,
      avg_order_value: avgOrderValue,
      active_customers: Number(uniqueCustomers.count) || 0,
    };
  }

  async getSalesTrend() {
    const result = await this.orderRepo
      .createQueryBuilder('o')
      .select("TO_CHAR(o.order_date, 'YYYY-MM')", 'period')
      .addSelect('SUM(o.total_price)', 'revenue')
      .groupBy('period')
      .orderBy('period', 'ASC')
      .getRawMany();

    return result.map(r => ({
      period: r.period,
      revenue: Number(r.revenue),
    }));
  }

  async getOrderList(status?: string, dateFrom?: string, dateTo?: string) {
    const qb = this.orderRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.user', 'user')
      .orderBy('o.order_date', 'DESC');

    if (status) qb.andWhere('o.status = :status', { status });
    if (dateFrom) qb.andWhere('o.order_date >= :dateFrom', { dateFrom });
    if (dateTo) qb.andWhere('o.order_date <= :dateTo', { dateTo });

    return qb.getMany();
  }
  async getTopProducts() {
    const result = await this.orderDetailRepo
      .createQueryBuilder('od')
      .leftJoin('od.product', 'p')
      .select('p.name', 'product_name')
      .addSelect('SUM(od.quantity)', 'total_sold')
      .addSelect('SUM(od.quantity * od.price_per_unit)', 'revenue')
      .groupBy('p.name')
      .orderBy('total_sold', 'DESC')
      .limit(10)
      .getRawMany();

    return result.map(r => ({
      product_name: r.product_name,
      total_sold: Number(r.total_sold),
      revenue: Number(r.revenue),
    }));
  }

  async getTopCustomers() {
    const result = await this.orderRepo
      .createQueryBuilder('o')
      .leftJoin('o.user', 'u')
      .select('u.company_name', 'customer')
      .addSelect('COUNT(o.order_id)', 'orders')
      .addSelect('SUM(o.total_price)', 'revenue')
      .groupBy('u.company_name')
      .orderBy('revenue', 'DESC')
      .limit(10)
      .getRawMany();

    return result.map(r => ({
      customer: r.customer,
      total_orders: Number(r.orders),
      total_spent: Number(r.revenue),
    }));
  }

  async getStatusDistribution() {
    const result = await this.orderRepo
      .createQueryBuilder('o')
      .select('o.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('o.status')
      .getRawMany();

    return result.map(r => ({
      status: r.status,
      count: Number(r.count),
    }));
  }
}
