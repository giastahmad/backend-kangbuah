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
    const totalOrders = await this.orderRepo.count();
    const totalRevenueResult = await this.orderRepo
      .createQueryBuilder('o')
      .select('SUM(o.total_price)', 'sum')
      .getRawOne();
    const totalRevenue = Number(totalRevenueResult.sum) || 0;

    const totalCustomers = await this.userRepo.count();

    return {
      total_orders: totalOrders,
      total_revenue: totalRevenue,
      total_customers: totalCustomers,
    };
  }

  async getSalesTrend() {
    const result = await this.orderRepo
      .createQueryBuilder('o')
      .select("TO_CHAR(o.order_date, 'YYYY-MM-DD')", 'date')
      .addSelect('SUM(o.total_price)', 'revenue')
      .groupBy('date')
      .orderBy('date', 'ASC')
      .getRawMany();

    return result.map(r => ({
      date: r.date,
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
      .groupBy('p.name')
      .orderBy('total_sold', 'DESC')
      .limit(5)
      .getRawMany();

    return result.map(r => ({
      product_name: r.product_name,
      total_sold: Number(r.total_sold),
    }));
  }

  async getTopCustomers() {
    const result = await this.orderRepo
      .createQueryBuilder('o')
      .leftJoin('o.user', 'u')
      .select('u.company_name', 'customer')
      .addSelect('SUM(o.total_price)', 'total_spent')
      .groupBy('u.company_name')
      .orderBy('total_spent', 'DESC')
      .limit(5)
      .getRawMany();

    return result.map(r => ({
      customer: r.customer,
      total_spent: Number(r.total_spent),
    }));
  }

  async getCategoryDistribution() {
    const result = await this.orderDetailRepo
      .createQueryBuilder('od')
      .leftJoin('od.product', 'p')
      .select('p.type', 'category')
      .addSelect('SUM(od.quantity)', 'total_sold')
      .groupBy('p.type') 
      .getRawMany();

    return result.map((r) => ({
      category: r.category,
      total_sold: Number(r.total_sold),
    }));
  }

  async getTotalCustomers() {
    const count = await this.userRepo.count();
    return { total_customers: count };
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

  async getWeeklySales() {
    const result = await this.orderRepo
      .createQueryBuilder('o')
      .select("TO_CHAR(DATE_TRUNC('week', o.order_date), 'IYYY-IW')", 'week')
      .addSelect('SUM(o.total_price)', 'revenue')
      .groupBy('week')
      .orderBy('week', 'ASC')
      .getRawMany();

    return result.map(r => ({
      week: r.week,
      revenue: Number(r.revenue),
    }));
  }
}
