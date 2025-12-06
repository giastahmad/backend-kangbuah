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

    return result.map((r) => ({
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

    return result.map((r) => ({
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

    return result.map((r) => ({
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

    return result.map((r) => ({
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

    return result.map((r) => ({
      week: r.week,
      revenue: Number(r.revenue),
    }));
  }

  async getDashboardInterpretation() {
    // 1. Ambil Data
    const summary = await this.getDashboardSummary();
    const weekly = await this.getWeeklySales();
    const statusDist = await this.getStatusDistribution();
    const topProducts = await this.getTopProducts();
    const categoryDist = await this.getCategoryDistribution();

    // 2. Analisis Tren Mingguan (Growth Analysis)
    let growthText = 'Data mingguan belum cukup untuk analisis tren.';
    let growthIcon = '➖';
    let isTrendDown = false;

    if (weekly.length >= 2) {
      // Ambil 2 minggu terakhir
      const currentWeek = weekly[weekly.length - 1];
      const prevWeek = weekly[weekly.length - 2];
      const currentRev = Number(currentWeek.revenue);
      const prevRev = Number(prevWeek.revenue);

      if (prevRev > 0) {
        const diff = currentRev - prevRev;
        const percentage = ((diff / prevRev) * 100).toFixed(1);

        if (diff > 0) {
          growthText = `**Performa Positif**: Pendapatan minggu ini **NAIK ${percentage}%** dibanding minggu lalu. (Kenaikan: Rp ${diff.toLocaleString('id-ID')})`;
          growthIcon = '📈';
        } else if (diff < 0) {
          growthText = `**Perhatian**: Pendapatan minggu ini **TURUN ${Math.abs(Number(percentage))}%** dibanding minggu lalu. Perlu strategi promosi baru.`;
          growthIcon = '📉';
          isTrendDown = true;
        } else {
          growthText =
            '**Stabil**: Pendapatan minggu ini sama persis dengan minggu lalu.';
        }
      }
    }

    // 3. Analisis AOV (Average Order Value) - Rata-rata keranjang belanja
    let aovText = '';
    if (summary.total_orders > 0) {
      const aov = summary.total_revenue / summary.total_orders;
      aovText = `Rata-rata nilai per transaksi saat ini adalah **Rp ${Math.floor(aov).toLocaleString('id-ID')}**.`;
    }

    // 4. Analisis Efisiensi Operasional (Status)
    let operationalNote = 'Operasional berjalan lancar.';
    const totalOrders = summary.total_orders;
    let cancelRate = 0
    if (totalOrders > 0) {
      const cancelled =
        statusDist.find((s) => s.status === 'CANCELLED')?.count || 0;
      const pending =
        statusDist.find((s) => s.status === 'PENDING')?.count || 0; // Sesuaikan string status dgn DB kamu

      cancelRate = (cancelled / totalOrders) * 100;

      if (cancelRate > 20) {
        operationalNote = `**Warning**: Tingkat pembatalan cukup tinggi (${cancelRate.toFixed(1)}%). Cek ketersediaan stok atau harga.`;
      } else if (pending > totalOrders * 0.5) {
        operationalNote = `**Tumpukan Pesanan**: Lebih dari 50% pesanan masih berstatus PENDING. Segera proses pesanan masuk.`;
      }
    }

    // 5. Analisis Pareto Produk (Top Product Contribution)
    let productInsight = '';
    let isProductDependent = false;
    if (topProducts.length > 0 && categoryDist.length > 0) {
      const topProd = topProducts[0];
      // Hitung total semua item terjual
      const totalItemsSold = categoryDist.reduce(
        (acc, curr) => acc + Number(curr.total_sold),
        0,
      );
      const contribution = (
        (Number(topProd.total_sold) / totalItemsSold) *
        100
      ).toFixed(1);

      productInsight = `Produk **${topProd.product_name}** adalah penopang utama, menyumbang **${contribution}%** dari total volume penjualan.`;
      if (Number(contribution) > 50) isProductDependent = true;
    }

    // 6. Logika Rekomendasi
    const singleBuyerRate = await this.getSinglePurchaseRate();
    const recommendations: string[] = [];
    const totalCust = Number(summary.total_customers);

    // A. Cek Tren Turun (Menggunakan flag dari step 2)
    if (isTrendDown) {
      recommendations.push(
        "• **Tinjau Strategi Marketing**: Tren pendapatan minggu ini menurun. Pertimbangkan Teknik Marketing yang menarik.",
      );
    }

    // B. Cek Retensi (Orders per User)
    const ordersPerUser = totalCust > 0 ? totalOrders / totalCust : 0;
    if (totalCust > 5 && singleBuyerRate > 0.6) {
      const percentage = (singleBuyerRate * 100).toFixed(0);
      recommendations.push(
        `• **Tingkatkan Repeat Order**: Sebanyak **${percentage}** Pelanggan hanya belanja 1x. Tingkatkan Pemasaran untuk Existing Customers.`,
      );
    }

    // C. Cek Ketergantungan Produk (Menggunakan flag dari step 5)
    if (isProductDependent) {
      recommendations.push(
        '• **Diversifikasi**: Toko terlalu bergantung pada satu produk terlaris. Promosikan kategori lain untuk mengurangi risiko stok.',
      );
    }

    // D. Cek Masalah Operasional (Menggunakan cancelRate dari step 4)
    if (cancelRate > 15) {
      recommendations.push(
        '• **Audit Operasional**: Tingkat pembatalan tinggi. Pastikan deskripsi produk jelas dan stok di sistem sesuai gudang.',
      );
    }

    // E. Default Recommendations (Jika semua aman)
    if (recommendations.length === 0) {
      if (totalCust < 10) {
        recommendations.push(
          '• **Akuisisi User**: Basis pelanggan masih kecil. Fokus pada marketing/iklan untuk mencari pelanggan baru.',
        );
      } else {
        recommendations.push(
          '• **Pertahankan**: Performa toko sehat. Fokus pada menjaga kecepatan pengiriman dan layanan pelanggan.',
        );
      }
    }

    // 7. Penyusunan Final Text
    const finalText = `
    ${growthIcon} **Analisis Tren Bisnis**
    ${growthText}

    **Insight Penjualan**
    ${aovText} ${productInsight}

    **Kesehatan Operasional**
    ${operationalNote}

    **Rekomendasi Sistem:**
    ${recommendations.join('\n')}
        `;

    return { interpretation: finalText.trim() };
  }

  async getSinglePurchaseRate() {
    const result = await this.orderRepo
      .createQueryBuilder('o')
      .select('o.user_id')
      .groupBy('o.user_id')
      .having('COUNT(o.order_id) = 1')
      .getRawMany();
      
    const singleBuyers = result.length;
    const totalCustomers = await this.userRepo.count();

    if (totalCustomers === 0) return 0;

    return singleBuyers / totalCustomers;
  }
}
