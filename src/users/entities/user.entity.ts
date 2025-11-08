import { Entity, PrimaryColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Order } from '../../orders/entities/order.entity'
import { Address } from './address.entity';

export type UserRole = 'CUSTOMER' | 'ADMIN';

@Entity({ name: 'users' }) // Menghubungkan class ini dengan tabel 'users'
export class User {
  @PrimaryColumn({ type: 'varchar' })
  user_id: string; // Akan diisi dengan UID dari Firebase

  @Column({ type: 'varchar', length: 100, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 100 })
  username: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Column({
    type: 'enum',
    enum: ['CUSTOMER', 'ADMIN'],
    default: 'CUSTOMER',
  })
  role: UserRole;

  @Column({ type: 'varchar', length: 255, nullable: true })
  company_name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  npwp: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone_number: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @Column({ type: 'bool' })
  is_verified: boolean;

  @Column({ type: 'varchar', nullable: true })
  hashed_refresh_token: string | null;

  //Relation

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  @OneToMany(() => Address, (address) => address.user)
  addresses: Address[];
}
