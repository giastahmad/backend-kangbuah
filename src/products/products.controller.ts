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
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductStatus, ProductType } from './entities/product.entity';
import { JwtAuthGuard } from 'src/auth/auth-guards/jwt-auth.guard';
import { RoleGuard } from 'src/auth/auth-guards/role.guard';
import { Roles } from 'src/auth/decorators/role.decorator';
import { CreateProductDto } from './dto/createProduct.dto';
import { UpdateProductDto } from './dto/updateProduct.dto';
import { OptionalJwtAuthGuard } from 'src/auth/auth-guards/optional-jwt-auth.guard';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('ADMIN')
  @UseInterceptors(FilesInterceptor('image', 5))
  async create(
    @Body() createProductDto: CreateProductDto,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    return await this.productsService.create(createProductDto, files);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async findAll(
    @Request() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(12), ParseIntPipe) limit: number,
    @Query('status') status?: ProductStatus[],
    @Query('type') type?: ProductType,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('order') order?: 'ASC' | 'DESC',
  ) {
    const isAdmin = req.user?.role === 'ADMIN';

    return await this.productsService.findAll({
      page,
      limit,
      status,
      type,
      isAdmin,
      search,
      sortBy,
      order,
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
  @UseInterceptors(FilesInterceptor('image', 5))
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    return await this.productsService.update(id, updateProductDto, files);
  }
}
