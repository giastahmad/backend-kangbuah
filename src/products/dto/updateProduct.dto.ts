import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsOptional,
  Min,
  IsUrl,
  IsArray,
} from 'class-validator';
import { ProductStatus, ProductType } from '../entities/product.entity';

export class UpdateProductDto {

    @IsString()
    @IsOptional()
    name?: string;

    @IsEnum(ProductType)
    @IsOptional()
    type?: ProductType;

    @IsString()
    @IsOptional()
    description?: string;

    @IsNumber()
    @IsOptional()
    @Min(0)
    price?: number;

    @IsString()
    @IsOptional()
    unit?: string;

    @IsNumber()
    @IsOptional()
    @Min(0)
    stock?: number;

    @IsEnum(ProductStatus)
    @IsOptional()
    status?: ProductStatus;

    @IsArray()
    @IsUrl({}, {each: true})
    @IsOptional()
    image_url?: string[]
}