import { Column, Entity, ManyToOne, PrimaryColumn } from "typeorm";
import { Order } from "./order.entity";

@Entity({name: 'order_details'})
export class OrderDetail{

    @PrimaryColumn({type: 'varchar'})
    oder_detail_id: string

    @Column({type: 'varchar'})
    order_id: string

    @Column({type: 'varchar'})
    product_id: string

    @Column({type: 'decimal', scale: 2})
    quantity: number

    @Column({type: 'decimal', precision: 10, scale: 2})
    price_per_unit: number

    //Relation

    @ManyToOne(() => Order, (order) => order.order_details)
    order: Order;
}