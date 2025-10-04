import { Order } from "src/orders/entities/order.entity";
import { Address } from "src/users/entities/address.entity";
import { User } from "src/users/entities/user.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryColumn } from "typeorm";

export enum paymentMethod {
    CASH = 'CASH',
    BANK_TRANSFER = 'BANK_TRANSFER',
    QRIS = 'QRIS'
}

export enum paymentStatus{
    UNPAID = 'UNPAID',
    PAID = 'PAID'
}

@Entity({name: 'invoices'})
export class Invoice{

    @PrimaryColumn({type: 'varchar'})
    invoice_id: string

    @Column({type: 'varchar'})
    order_id: string

    @Column({type: 'varchar'})
    user_id: string

    @Column({type: 'varchar'})
    billing_address_id: string

    @CreateDateColumn({type: 'timestamp with time zone'})
    invoice_date: string

    @Column({type: 'decimal', precision: 10, scale: 2})
    total_price: number

    @Column({type: 'enum', enum: paymentMethod, default: paymentMethod.BANK_TRANSFER})
    payment_method: paymentMethod

    @Column({type: 'enum', enum: paymentStatus, default: paymentStatus.UNPAID})
    payment_status: paymentStatus

    //Relation

    @OneToOne(() => Order, (order) => order.invoice)
    @JoinColumn({name: 'order_id'})
    order: Order

    @ManyToOne(() => User)
    @JoinColumn({name: 'user_id'})
    user: User

    @ManyToOne(() => Address)
    @JoinColumn({name: 'address_id'})
    address_id: Address
}