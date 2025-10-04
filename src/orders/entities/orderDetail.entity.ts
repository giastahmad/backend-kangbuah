import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { Order } from "./order.entity";
import { Product } from "src/products/entities/product.entity";

@Entity({name: 'order_details'})
export class OrderDetail{

    @PrimaryColumn({type: 'varchar'})
    order_detail_id: string

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
    @JoinColumn({ name: 'order_id' })
    order: Order;

    @ManyToOne(() => Product)
    @JoinColumn({ name: 'product_id' })
    product: Product;
}