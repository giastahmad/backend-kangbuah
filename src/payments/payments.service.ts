import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MailService } from 'src/mail/mailer.service';
import { Order } from 'src/orders/entities/order.entity';
import { OrdersService } from 'src/orders/orders.service';
import { SupabaseService } from 'src/supabase/supabase.service';
import { Repository } from 'typeorm';
import { Invoice, paymentStatus } from './entities/invoices.entity';
import { v4 as uuidv4 } from 'uuid';
import PDFDocument from 'pdfkit';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(Invoice)
    private invoicesRepository: Repository<Invoice>,
    private readonly supabaseService: SupabaseService,
    private readonly ordersService: OrdersService,
    private readonly mailService: MailService,
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

  async generateAndSendInvoice(orderId: string) {
    const order = await this.ordersRepository.findOne({
      where: { order_id: orderId },
      relations: [
        'user',
        'address_id',
        'order_details',
        'order_details.product',
      ],
    });

    if (!order) {
      throw new NotFoundException('Pesanan tidak ditemukan');
    }

    const newInvoice = this.invoicesRepository.create({
      invoice_id: uuidv4(),
      order_id: order.order_id,
      user_id: order.user_id,
      billing_address_id: order.delivery_address_id,
      invoice_date: new Date(),
      total_price: order.total_price,
      payment_status: paymentStatus.PAID,
    });

    const savedInvoice = await this.invoicesRepository.save(newInvoice);

    const pdfBuffer = await this.generatePdfInvoice(order, savedInvoice);

    await this.mailService.sendMail(
      order.user.email,
      `Invoice Pembayaran #${savedInvoice.invoice_id}`,
      'Terlampir adalah invoice untuk pesanan anda. Terima Kasih!',
      [
        {
          filename: `invoice-${savedInvoice.invoice_id}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    );
  }

  private async generatePdfInvoice(
    order: Order,
    invoice: Invoice,
  ): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    doc.fontSize(20).text('INVOICE', { align: 'center' });
    doc
      .fontSize(10)
      .text(`Invoice #: ${invoice.invoice_id}`, { align: 'right' });
    doc.text(
      `Tanggal: ${new Date(invoice.invoice_date).toLocaleDateString('id-ID')}`,
    );
    doc.moveDown();
    doc.text('Dibayarkan oleh:', { underline: true });
    doc.text(order.user.company_name || order.user.username);
    doc.moveDown();
    const tableTop = doc.y;
    doc.font('Helvetica-Bold');
    doc.text('Produk', 50, tableTop);
    doc.text('Jumlah', 250, tableTop);
    doc.text('Harga Satuan', 350, tableTop, { width: 90, align: 'right' });
    doc.text('Total', 450, tableTop, { width: 90, align: 'right' });
    doc.font('Helvetica');
    let i = 0;

    for (const item of order.order_details) {
      const y = doc.y;
      doc.text(item.product.name, 50, y);
      doc.text(`${item.quantity} ${item.product.unit}`, 250, y);
      doc.text(`Rp ${item.price_per_unit}`, 350, y, {
        width: 90,
        align: 'right',
      });
      const totalItem = item.quantity * item.price_per_unit;
      doc.text(
        `Rp ${totalItem.toFixed(2)}`, 
        450,
        y,
        { width: 90, align: 'right' },
      );
      doc.moveDown();
    }

    doc.lineCap('butt').moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(2);

    doc.fontSize(12).font('Helvetica-Bold');
    doc.text(`GRAND TOTAL: Rp ${Number(order.total_price).toFixed(2)}`, {
      align: 'right',
    });

    return new Promise<Buffer>((resolve) => {
      const buffers: any[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.end();
    });
  }
}