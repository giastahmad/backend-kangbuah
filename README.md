<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
  <span style="display: inline-block; width: 80px;"></span>
  <img src="./assets/kangBUAHH.png" width="120" alt="KangBuah Logo" />
</p>

# KangBuah Backend API

Repositori ini berisi kode sumber sisi server (backend) untuk platform KangBuah. Aplikasi dibangun menggunakan framework NestJS dengan TypeScript, menggunakan Supabase sebagai database utama dan Firebase untuk layanan autentikasi.

## Prasyarat Sistem

Pastikan sistem Anda telah terinstal perangkat lunak berikut sebelum menjalankan aplikasi:

* **Node.js**: Versi LTS (disarankan v18 atau v20 ke atas)
* **NPM**: Manajer paket Node.js

## Teknologi yang Digunakan

Aplikasi ini menggunakan dependensi utama berikut:

* **Core Framework**: NestJS v11
* **Bahasa Pemrograman**: TypeScript
* **Database & ORM**: PostgreSQL (via Supabase), TypeORM
* **Autentikasi**: Passport, JWT (JSON Web Token), Bcrypt
* **Layanan Pihak Ketiga**:
  * **Supabase**: Manajemen Database dan Auth Client
  * **Firebase Admin**: Push Notification dan manajemen user eksternal
  * **Nodemailer**: Layanan pengiriman email (SMTP)
* **Utilitas**:
  * `pdfkit`: Pembuatan dokumen PDF
  * `date-fns`: Manipulasi tanggal
  * `class-validator`: Validasi input data (DTO)

## Instalasi

Ikuti langkah-langkah berikut untuk menginstal dependensi proyek:

1. Clone repositori ke komputer lokal:
```bash
git clone <repository-url>
cd backend-kangbuah
```

2. Instal dependensi menggunakan NPM:
```bash
npm install
```

## Konfigurasi Environment

Aplikasi ini memerlukan konfigurasi variabel lingkungan agar dapat berjalan. Buat file bernama `.env` di direktori root proyek dan isi dengan kunci berikut:
```env
# Server Configuration
NODE_ENV=development

# Database Configuration (TypeORM/Postgres)
DATABASE_URL=postgresql://user:password@host:port/database
DB_PASSWORD=your_db_password

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# Authentication (JWT)
JWT_SECRET=your_jwt_access_token_secret
JWT_REFRESH_SECRET=your_jwt_refresh_token_secret

# Firebase Configuration
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# Email Service (SMTP via Nodemailer)
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
```

**Catatan**: Pastikan format `FIREBASE_PRIVATE_KEY` ditulis dengan benar (termasuk karakter baris baru `\n`) jika dimasukkan langsung ke variabel lingkungan.

## Menjalankan Aplikasi

Gunakan perintah berikut untuk menjalankan server:
```bash
# Mode development
npm run start

# Mode watch (restart otomatis saat ada perubahan kode)
npm run start:dev

# Mode debug
npm run start:debug

# Mode produksi (menjalankan hasil build dari folder dist)
npm run start:prod
```

Secara default, aplikasi akan berjalan pada port yang ditentukan oleh NestJS.

## Build dan Deployment

Untuk mempersiapkan aplikasi ke lingkungan produksi:

1. Jalankan perintah build untuk mengompilasi TypeScript ke JavaScript:
```bash
npm run build
```

2. Folder `dist/` akan dibuat berisi kode produksi.

3. Pastikan seluruh variabel yang ada di file `.env` telah dimasukkan ke dalam konfigurasi environment variables di dashboard layanan deployment yang digunakan.

## Struktur Direktori
```
.
├── src/              # Berisi kode sumber utama aplikasi (Modules, Controllers, Services)
├── assets/           # Menyimpan aset statis seperti logo aplikasi
├── test/             # Berisi konfigurasi dan file untuk end-to-end testing
└── dist/             # Folder output hasil kompilasi build (diabaikan oleh git)
```

## Tim Pengembang

Proyek ini dikembangkan oleh:
- **Faizzani Zingsky Pratiwi** - Project Manager
- **Risya Annisa' Chairyah** - Backend Developer
- **Giast Ahmad** - Backend Developer
- **Devi Humaira** - Frontend Developer
- **Muhammad Danendra Syah H** - Frontend Developer

## Lisensi

<p>&copy; 2025 CV Agro Niaga Sejahtera. All rights reserved.</p>