import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    console.log('=================📧 MAIL CONFIG DEBUG =================');
    console.log('EMAIL_USER:', process.env.EMAIL_USER || '❌ undefined');
    console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '✅ Loaded' : '❌ Missing');
    console.log('=======================================================');

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  async sendMail(to: string, subject: string, html: string) {
    try {
      console.log(`📨 Sending email to: ${to}`);
      const info = await this.transporter.sendMail({
        from: `"KangBuah" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
      });
      console.log('✅ Email sent:', info.messageId);
      return info;
    } catch (err) {
      console.error('❌ Error sending email:', err);
      throw err;
    }
  }
}
