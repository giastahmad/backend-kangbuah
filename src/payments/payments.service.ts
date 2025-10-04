import { Injectable } from '@nestjs/common';
import { OrdersService } from 'src/orders/orders.service';
import { SupabaseService } from 'src/supabase/supabase.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly ordersService: OrdersService,
  ) {}

  async uploadPaymentProof(orderId: string, file: Express.Multer.File) {
    const supabaseClient = this.supabaseService.getClient();
    const newFileName = `${orderId}-${Date.now()}-${file.originalname}`;

    const { data, error } = await supabaseClient.storage
      .from('payment-proofs')
      .upload(newFileName, file.buffer, {
        contentType: file.mimetype,
      });

    if (error) {
      throw new Error('Gagal Mengunggah file');
    }

    const urlResult = supabaseClient.storage
      .from('payment-proofs')
      .getPublicUrl(newFileName);

    if (!urlResult.data.publicUrl) {
      throw new Error('Gagal mendapatkan URL publik setelah unggah.');
    }
    const publicUrl = urlResult.data.publicUrl;

    await this.ordersService.updateAttachmentUrl(orderId, publicUrl);

    return {
      message: 'Bukti Pembayaran berhasil diunggah',
      fileUrl: publicUrl,
    };
  }
}
