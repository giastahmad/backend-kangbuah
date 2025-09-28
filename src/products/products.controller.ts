import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductStatus, ProductType } from './entities/product.entity';
import { JwtAuthGuard } from 'src/auth/auth-guards/jwt-auth.guard';
import { RoleGuard } from 'src/auth/auth-guards/role.guard';
import { Roles } from 'src/auth/decorators/role.decorator';
import { CreateProductDto } from './dto/createProduct.dto';
import { UpdateProductDto } from './dto/updateProduct.dto';
import { OptionalJwtAuthGuard } from 'src/auth/auth-guards/optional-jwt-auth.guard';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('ADMIN')
  async create(@Body() createProductDto: CreateProductDto) {
    return await this.productsService.create(createProductDto);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async findAll(
    @Request() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('status') status?: ProductStatus[],
    @Query('type') type?: ProductType[],
  ) {
    console.log('req.user:', req.user);
    console.log('user role:', req.user?.role);

    const isAdmin = req.user?.role == 'ADMIN';
    console.log('isAdmin: ', isAdmin);

    return await this.productsService.findAll({
      page,
      limit,
      status,
      type,
      isAdmin,
    });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('ADMIN')
  async delete(@Param('id') id: string) {
    return await this.productsService.delete(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('ADMIN')
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return await this.productsService.update(id, updateProductDto);
  }
}
