import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Address } from '../../users/entities/address.entity'
import { OrderDetail } from './orderDetail.entity'
import { Invoice } from '../../payments/entities/invoices.entity'

// Mendefinisikan tipe data ENUM agar sesuai dengan yang ada di database
export enum OrderStatus {
  MENUNGGU_VERIFIKASI = 'MENUNGGU_VERIFIKASI',
  MENUNGGU_PEMBAYARAN = 'MENUNGGU_PEMBAYARAN',
  SEDANG_DIPROSES = 'SEDANG_DIPROSES',
  DALAM_PENGIRIMAN = 'DALAM_PENGIRIMAN',
  SELESAI = 'SELESAI',
  DIBATALKAN = 'DIBATALKAN',
}

export enum paymentMethod {
  QRIS = 'QRIS',
  BANK_TRANSFER = 'BANK_TRANSFER'
}

@Entity({ name: 'orders' })
export class Order {
  @PrimaryColumn({ type: 'varchar' })
  order_id: string;

  @Column({ type: 'varchar' })
  user_id: string;

  @Column({ type: 'varchar' })
  delivery_address_id: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  po_number: string;

  @Column({ type: 'timestamp with time zone' })
  order_date: Date;

  @Column({ type: 'date', nullable: true })
  delivery_date: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  delivery_time: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tax: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  shipping_fee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total_price: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  attachment_url: string;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.SEDANG_DIPROSES,
  })
  status: OrderStatus;

  @Column({ type: 'int', nullable: true })
  rating: number;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @Column({
    type: 'enum',
    enum: paymentMethod
  })
  payment_method: paymentMethod;
  
  @Column({ nullable: true })
  delivery_pic_name: string;

  @Column({ nullable: true })
  delivery_street: string;

  @Column({ nullable: true })
  delivery_ward: string;

  @Column({ nullable: true })
  delivery_city: string;

  @Column({ nullable: true })
  delivery_province: string;

  @Column({ nullable: true })
  delivery_postal_code: string;

  @Column({ nullable: true })
  billing_company_name: string;

  @Column({ nullable: true })
  billing_phone_number: string;

  // --- RELASI ANTAR TABEL ---

  @ManyToOne(() => User, (user) => user.orders)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Address)
  @JoinColumn({ name: 'delivery_address_id' })
  delivery_address: Address;

  @OneToMany(() => OrderDetail, (detail) => detail.order)
  order_details: OrderDetail[];

  @OneToOne(() => Invoice, (invoice) => invoice.order)
  invoice: Invoice;
}