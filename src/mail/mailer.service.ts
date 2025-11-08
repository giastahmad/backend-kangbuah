import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendMail(to: string, subject: string, html: string, attachments: any[] = []) {
    try {
      const info = await this.transporter.sendMail({
        from: `"KangBuah" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
        attachments
      });
      return info;
    } catch (err) {
      console.error('Error sending email:', err);
      throw new InternalServerErrorException('Gagal kirim email');
    }
  }
}
