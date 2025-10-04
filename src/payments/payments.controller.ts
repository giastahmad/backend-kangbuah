import { Controller, Param, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from 'src/auth/auth-guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) {}

    @Post('upload-proof/:orderId')
    @UseInterceptors(FileInterceptor('proof'))
    async uploadPaymentproof(
        @Param('orderId') orderId: string,
        @UploadedFile() file: Express.Multer.File,
    ){
        return this.paymentsService.uploadPaymentProof(orderId, file)
    }

}
