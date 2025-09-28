import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Product, ProductStatus, ProductType } from './entities/product.entity';
import { In, Repository } from 'typeorm';
import { CreateProductDto } from './dto/createProduct.dto';
import { v4 as uuidv4 } from 'uuid';
import { DeleteResult } from 'typeorm/browser';
import { UpdateProductDto } from './dto/updateProduct.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
  ) {}

  async create(createProductDto: CreateProductDto) {
    const isExist = await this.productsRepository.findOneBy({
      name: createProductDto.name,
    });

    if (isExist) {
      throw new ConflictException('Produk dengan nama tersebut sudah ada');
    }

    const newProduct = this.productsRepository.create({
      ...createProductDto,
      product_id: uuidv4(),
    });

    if (newProduct.stock == 0) {
      newProduct.status = ProductStatus.STOK_HABIS;
    }

    return this.productsRepository.save(newProduct);
  }

  async findAll(option: {
    page: number;
    limit: number;
    status?: ProductStatus[];
    type?: ProductType[];
    isAdmin: boolean;
  }) {
    const take = option.limit || 10;
    const skip = (option.page - 1) * take;

    const where: any = {};
    console.log('isAdmin in service:', option.isAdmin);

    if (!option.isAdmin) {
        where.status = 'TERSEDIA';
    } else if (option.isAdmin && option.status) {
        const statuses = Array.isArray(option.status) ? option.status : [option.status];
        where.status = In(statuses);
    }

    if (option.type) {
      const types = Array.isArray(option.type) ? option.type : [option.type];
      where.type = In(types);
    }

    const [result, total] = await this.productsRepository.findAndCount({
      take: take,
      skip: skip,
      where: where,
    });

    return {
      result: result,
      page: option.page,
      max_page: Math.ceil(total / option.limit),
      total: total,
    };
  }

  async delete(id: string) {
    const result: DeleteResult = await this.productsRepository.delete(id);

    if (result.affected == 0) {
      throw new NotFoundException(`Produk dengan id "${id}" tidak ditemukan`);
    }
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const product = await this.productsRepository.findOneBy({ product_id: id });

    if (!product) {
      throw new NotFoundException(`Produk dengan ID "${id}" tidak ditemukan`);
    }

    Object.assign(product, updateProductDto);

    if (product.status !== ProductStatus.TIDAK_AKTIF) {

      if (product.stock <= 0) {

        product.status = ProductStatus.STOK_HABIS;
      } else {
        product.status = ProductStatus.TERSEDIA;
      }

    }

    return this.productsRepository.save(product);
  }
}
