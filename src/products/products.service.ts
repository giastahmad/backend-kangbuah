import {
  BadRequestException,
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
import { SupabaseService } from 'src/supabase/supabase.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
    private supabaseService: SupabaseService,
  ) {}

  async create(
    createProductDto: CreateProductDto,
    files: Array<Express.Multer.File>,
  ) {
    const isExist = await this.productsRepository.findOneBy({
      name: createProductDto.name,
    });

    if (isExist) {
      throw new ConflictException('Produk dengan nama tersebut sudah ada');
    }

    if (!files || files.length === 0) {
      throw new BadRequestException('Minimal 1 gambar untuk satu produk');
    }

    const supabaseClient = this.supabaseService.getClient();
    const imageUrls: string[] = [];

    const uploadPromises = files.map((file) => {
      const newFileName = `${Date.now()}-${file.originalname}`;
      return supabaseClient.storage
        .from('product-images')
        .upload(newFileName, file.buffer, { contentType: file.mimetype });
    });

    const uploadResult = await Promise.all(uploadPromises);

    for (const result of uploadResult) {
      if (result.error) {
        throw new Error(`Gagal mengunggah file: ${result.error.message}`);
      }
    }

    for (let i = 0; i < uploadResult.length; i++) {
      const newFileName = `${uploadResult[i].data?.path}`;
      const {
        data: { publicUrl },
      } = supabaseClient.storage
        .from('product-images')
        .getPublicUrl(newFileName);

      if (publicUrl) {
        imageUrls.push(publicUrl);
      }
    }

    const newProduct = this.productsRepository.create({
      ...createProductDto,
      product_id: uuidv4(),
      image_url: imageUrls
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
      const statuses = Array.isArray(option.status)
        ? option.status
        : [option.status];
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
    const product = await this.productsRepository.findOneBy({product_id: id});
    const supabaseClient = this.supabaseService.getClient();

    if(product){
      const imagesToDelete: string[] = product.image_url
      if(imagesToDelete && imagesToDelete.length > 0){
        const fileNameToDelete = imagesToDelete.map(url => url.split('/').pop()!);
        await supabaseClient.storage.from('product-images').remove(fileNameToDelete);
      }
    }

    const result: DeleteResult = await this.productsRepository.delete(id);

    if (result.affected == 0) {
      throw new NotFoundException(`Produk dengan id "${id}" tidak ditemukan`);
    }
  }

  async update(id: string, updateProductDto: UpdateProductDto, files: Array<Express.Multer.File>) {
    const product = await this.productsRepository.findOneBy({ product_id: id });

    if (!product) {
      throw new NotFoundException(`Produk dengan ID "${id}" tidak ditemukan`);
    }

    const supabaseClient = this.supabaseService.getClient();

    const oldImageUrls = product.image_url || [];
    const existingImageUrls = updateProductDto.existing_image_url || [];
    const urlToDelete = oldImageUrls.filter(url => !existingImageUrls.includes(url))

    if(urlToDelete.length > 0){
      const fileNameToDelete = urlToDelete.map(url => url.split('/').pop()!);
      await supabaseClient.storage.from('product-images').remove(fileNameToDelete)
    }

    const newImages: string[] = [];
    if(files && files.length > 0){
      const uploadPromise = files.map(file => {
        const newFileName = `${Date.now()}-${file.originalname}`;
        return supabaseClient.storage.from('product-images').upload(newFileName, file.buffer, {contentType: file.mimetype});
      });
      const uploadResult = await Promise.all(uploadPromise);

      uploadResult.forEach(result => {
        if(result.data){
          const {data: {publicUrl}} = supabaseClient.storage.from('product-images').getPublicUrl(result.data.path);
          newImages.push(publicUrl);
        }
      });
    }

    const finalImageUrls = [...existingImageUrls, ...newImages];

    Object.assign(product, updateProductDto);
    product.image_url = finalImageUrls;

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
