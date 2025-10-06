import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from 'src/orders/entities/order.entity';
import { Invoice } from './entities/invoices.entity';
import { MailModule } from 'src/mail/mail.module';
import { OrdersModule } from 'src/orders/orders.module';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, Invoice]),
    MailModule,
    OrdersModule,
    SupabaseModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService]
})
export class PaymentsModule {}
