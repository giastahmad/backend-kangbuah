import { Controller, Get, Query} from '@nestjs/common';
import { ReportService } from './report.service';

@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('summary')
  getSummary() {
    return this.reportService.getDashboardSummary();
  }

  @Get('trend')
  getTrend() {
    return this.reportService.getSalesTrend();
  }

  @Get('orders')
  getOrderList(
    @Query('status') status?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string
  ) {
    return this.reportService.getOrderList(status, dateFrom, dateTo);
  }

  @Get('top-products')
  getTopProducts() {
    return this.reportService.getTopProducts();
  }

  @Get('top-customers')
  getTopCustomers() {
    return this.reportService.getTopCustomers();
  }

  @Get('status-distribution')
  getStatusDistribution() {
    return this.reportService.getStatusDistribution();
  }

  @Get('category-distribution')
  getCategoryDistribution() {
    return this.reportService.getCategoryDistribution();
  }

  @Get('total-customers')
  getTotalCustomers() {
    return this.reportService.getTotalCustomers();
  }

  @Get('weekly-sales')
  getWeeklySales() {
    return this.reportService.getWeeklySales();
  }
  @Get('summary-full')
  getFullSummary() {
    return this.reportService.getDashboardInterpretation();
  }
}
