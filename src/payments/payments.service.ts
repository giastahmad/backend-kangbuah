import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MailService } from 'src/mail/mailer.service';
import { Order, OrderStatus } from 'src/orders/entities/order.entity';
import { OrdersService } from 'src/orders/orders.service';
import { SupabaseService } from 'src/supabase/supabase.service';
import { Repository } from 'typeorm';
import { Invoice, paymentStatus } from './entities/invoices.entity';
import { v4 as uuidv4 } from 'uuid';
import PDFDocument from 'pdfkit';
import * as path from 'path';

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
    await this.ordersService.updateOrderStatus(
      orderId,
      OrderStatus.MENUNGGU_VERIFIKASI,
    );

    this.generateAndSendInvoice(orderId).catch((err) => {
      console.error(`Gagal mengirim invoice untuk order ${orderId}:`, err);
    });

    return {
      message: 'Bukti Pembayaran berhasil diunggah',
      fileUrl: publicUrl,
    };
  }

  async generateAndSendInvoice(orderId: string) {
    const order = await this.ordersRepository.findOne({
      where: { order_id: orderId },
      relations: ['user', 'order_details', 'order_details.product'],
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
      payment_method: order.payment_method,
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
    const formatCurrency = (value: number | string) => {
      return new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(value));
    };

    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    try {
      const watermarkPath = path.join(__dirname, '..', 'assets/kangBUAHH.png');

      const pageHeight = doc.page.height;
      const pageWidth = doc.page.width;

      doc.save();

      doc.opacity(0.2);

      doc.image(watermarkPath, 0, 0, {
        fit: [pageWidth, pageHeight],
        align: 'center',
        valign: 'center',
      });

      doc.restore();
    } catch (err) {
      console.error('Gagal memuat watermark untuk PDF:', err);
    }

    doc.font('Helvetica-Bold');
    doc.fontSize(20).text('INVOICE', { align: 'center', underline: true });
    doc.moveDown();

    doc
      .fontSize(10)
      .font('Helvetica')
      .text(
        `Tanggal: ${new Date(invoice.invoice_date).toLocaleDateString('id-ID')}`,
        { continued: true },
      );
    doc.text(`Invoice #: ${invoice.invoice_id}`, { align: 'right' });
    doc.moveDown();

    doc.text('Dibayarkan oleh', { continued: true });
    doc.text('Diterima oleh', { align: 'right' });

    doc.font('Helvetica-Bold');
    doc.text(`${order.billing_company_name} - ${order.delivery_pic_name}`, {
      continued: true,
    });
    doc.text('Agro Niaga Sejahtera', { align: 'right' });
    doc.moveDown();

    doc.font('Helvetica').text(order.delivery_street, { continued: true });
    doc.text('Jl H Taiman Timur', { align: 'right' });

    doc.text(
      `${order.delivery_ward ? order.delivery_ward + ', ' : ''}${order.delivery_city}`,
      { continued: true },
    );
    doc.text('Gedong, Jakarta Timur', { align: 'right' });

    doc.text(`${order.delivery_province} ${order.delivery_postal_code}`, {
      continued: true,
    });
    doc.text('DKI Jakarta', { align: 'right' });

    doc.text(`Telp: ${order.billing_phone_number}`, { continued: true });
    doc.text(`Telp: 081212599323`, { align: 'right' });

    doc.text(order.user.email, {continued: true});
    doc.text('agroniagasejahtera04@gmail.com', {
      align: 'right',
    });

    doc.text('kangcodekangbuah@gmail.com', {
      align: 'right',
    });

    doc.moveDown(2);
    const tableTop = doc.y;
    doc.lineCap('butt').moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.font('Helvetica-Bold');
    doc.text('Produk', 50, tableTop);
    doc.text('Jumlah', 250, tableTop);
    doc.text('Harga Satuan', 350, tableTop, { width: 90, align: 'right' });
    doc.text('Total', 450, tableTop, { width: 90, align: 'right' });
    doc.moveDown();

    doc.font('Helvetica');
    let i = 0;

    for (const item of order.order_details) {
      const y = doc.y;
      doc.text(item.product.name, 50, y);
      doc.text(`${item.quantity} x ${item.product.unit}`, 250, y);
      doc.text(`Rp ${formatCurrency(item.price_per_unit)}`, 350, y, {
        width: 90,
        align: 'right',
      });
      const totalItem = item.quantity * item.price_per_unit;
      doc.text(`Rp ${formatCurrency(totalItem)}`, 450, y, {
        width: 90,
        align: 'right',
      });
      doc.moveDown();
    }

    doc.lineCap('butt').moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(2);

    doc.fontSize(12).font('Helvetica-Bold');
    doc.text(`GRAND TOTAL Rp ${formatCurrency(order.total_price)}`, {
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
