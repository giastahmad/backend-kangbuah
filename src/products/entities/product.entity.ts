import { OrderDetail } from 'src/orders/entities/orderDetail.entity';
import { Entity, PrimaryColumn, Column, OneToMany } from 'typeorm';

// export type ProductType = 'BUAH' | 'SAYUR' | 'LAIN_LAIN';
// export type ProductStatus = 'TERSEDIA' | 'STOK_HABIS' | 'TIDAK_AKTIF';

export enum ProductType {
  BUAH = 'BUAH',
  SAYUR = 'SAYUR',
  LAIN_LAIN = 'LAIN_LAIN',
}

export enum ProductStatus {
  TERSEDIA = 'TERSEDIA',
  STOK_MENIPIS = 'STOK_MENIPIS',
  STOK_HABIS = 'STOK_HABIS',
  TIDAK_AKTIF = 'TIDAK_AKTIF',
}

@Entity({ name: 'products' })
export class Product {
  @PrimaryColumn({ type: 'varchar' }) // Primary Key
  product_id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({
    type: 'enum',
    enum: ['BUAH', 'SAYUR', 'LAIN_LAIN'],
  })
  type: ProductType;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'varchar', length: 50 })
  unit: string;

  @Column({ type: 'int' })
  stock: number;

  @Column({
    type: 'enum',
    enum: ['TERSEDIA', 'STOK_MENIPIS', 'STOK_HABIS', 'TIDAK_AKTIF'],
    default: 'TERSEDIA',
  })
  status: ProductStatus;

  @Column({ type: 'text', nullable: true, array: true })
  image_url: string[];

  // Relation

  @OneToMany(() => OrderDetail, (detail) => detail.product)
  order_details: OrderDetail[];
}
