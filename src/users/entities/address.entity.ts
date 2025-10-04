import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { User } from "./user.entity";

export enum AddressesType {
    BILLING = 'BILLING',
    DELIVERY = 'DELIVERY'
}

@Entity({name: 'addresses'})
export class Address{
    @PrimaryColumn({type: 'varchar'})
    address_id: string

    @Column({type: 'varchar'})
    user_id: string

    @Column({type: 'enum', enum: AddressesType, default: AddressesType.DELIVERY})
    type: AddressesType

    @Column({type: 'text'})
    street: string

    @Column({type: 'varchar'})
    city: string

    @Column({type: 'varchar'})
    province: string

    @Column({type: 'varchar'})
    postal_code: string

    @Column({type: 'varchar', nullable: true})
    pic_name: string

    //Relation

    @ManyToOne(() => User, (user) => user.addresses)
    @JoinColumn({ name: 'user_id' })
    user: User
}