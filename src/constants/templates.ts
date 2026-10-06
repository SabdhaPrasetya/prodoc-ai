import { PRDTemplate } from '../types/prd';

export const PRD_TEMPLATES: PRDTemplate[] = [
  {
    id: 'fintech-core',
    name: 'Fintech & Payment Infrastructure',
    category: 'Layanan Keuangan & Perbankan',
    description: 'Standar spesifikasi sistem pembayaran real-time, buku besar ganda (double-entry ledger), kepatuhan regulasi SNAP/BI-FAST, dan mitigasi risiko penipuan.',
    defaultSections: [
      {
        number: '01',
        title: 'Ringkasan Eksekutif & Visi Produk',
        placeholder: 'Jelaskan masalah utama penyelesaian transaksi, efisiensi likuiditas, serta nilai tambah produk bagi nasabah korporasi maupun ritel.',
      },
      {
        number: '02',
        title: 'Metrik Keberhasilan & KPI Kuantitatif',
        placeholder: 'Tetapkan target terukur seperti Settlement Latency (ms/menit), Auto-Reconciliation Rate (%), dan target GTV bulanan.',
      },
      {
        number: '03',
        title: 'Alur Transaksi & Spesifikasi Fungsional',
        placeholder: 'Uraikan tahapan inisiasi transaksi, validasi KYC/AML, penguncian kurs, hingga notifikasi penyelesaian.',
      },
      {
        number: '04',
        title: 'Arsitektur Buku Besar, Kontrak API & Keamanan',
        placeholder: 'Rincikan endpoint REST/Webhook, mekanisme Idempotency-Key, enkripsi payload, dan skema database.',
      },
      {
        number: '05',
        title: 'Mitigasi Risiko, Rekonsiliasi Gagal & Kriteria Rilis',
        placeholder: 'Definisikan prosedur penanganan timeout mitra kliring, dead-letter queue, dan syarat kelulusan UAT.',
      },
    ],
  },
  {
    id: 'enterprise-saas',
    name: 'Enterprise B2B SaaS & Workflow Platform',
    category: 'Perangkat Lunak Korporasi',
    description: 'Template terstruktur untuk aplikasi SaaS multi-tenant dengan kontrol akses berbasis peran (RBAC), audit log, integrasi SSO, dan analitik eksekutif.',
    defaultSections: [
      {
        number: '01',
        title: 'Latar Belakang Bisnis & Pernyataan Masalah',
        placeholder: 'Identifikasi hambatan operasional yang dialami tim enterprise saat ini dan dampak finansialnya.',
      },
      {
        number: '02',
        title: 'Sasaran Produk & Indikator Performa Utama (KPI)',
        placeholder: 'Target adopsi pengguna aktif mingguan (WAU), pengurangan waktu siklus kerja (%), dan Net Retention Rate.',
      },
      {
        number: '03',
        title: 'Matriks Peran Pengguna (RBAC) & Alur Kerja Inti',
        placeholder: 'Jabarkan hak akses Admin Organisasi, Manajer Operasional, dan Pemeriksa Audit beserta skenario penggunaan.',
      },
      {
        number: '04',
        title: 'Arsitektur Multi-Tenant, Integrasi Webhook & SLA',
        placeholder: 'Spesifikasi isolasi data antar-tenant, batas rate-limiting API, dan skema ekspor data terjadwal.',
      },
      {
        number: '05',
        title: 'Strategi Rollout Bertahap & Kesiapan Operasional',
        placeholder: 'Tahapan beta tertutup, migrasi data pelanggan lama, dan daftar periksa keamanan SOC2/ISO27001.',
      },
    ],
  },
  {
    id: 'ai-agentic-workflow',
    name: 'AI Copilot & Otomasi Agen Cerdas',
    category: 'Kecerdasan Buatan & Data',
    description: 'Dirancang khusus untuk fitur berbasis LLM, pipeline RAG, evaluasi akurasi respons, batasan latensi token, dan pengaman halusinasi (guardrails).',
    defaultSections: [
      {
        number: '01',
        title: 'Visi Kapabilitas AI & Kasus Penggunaan Utama',
        placeholder: 'Bagaimana asisten AI mempercepat pengambilan keputusan pengguna tanpa mengorbankan kendali manusia (Human-in-the-loop).',
      },
      {
        number: '02',
        title: 'Tolok Ukur Kualitas Model & Metrik Evaluasi',
        placeholder: 'Target tingkat penerimaan draf AI (Acceptance Rate >= 75%), Time-to-First-Token (<= 800ms), dan tingkat halusinasi (< 1%).',
      },
      {
        number: '03',
        title: 'Desain Interaksi Prompt, Konteks & Umpan Balik',
        placeholder: 'Mekanisme injeksi konteks dokumen, tampilan kutipan sumber (grounding citations), dan kontrol regenerasi.',
      },
      {
        number: '04',
        title: 'Arsitektur Orkestrasi Model, Vector Index & Caching',
        placeholder: 'Pemilihan model Gemini, strategi chunking dokumen, manajemen kuota token, dan fallback penanganan error.',
      },
      {
        number: '05',
        title: 'Privasi Data, Filter Keamanan & Red-Teaming',
        placeholder: 'Pencegahan kebocoran PII, penanganan prompt injection, dan log audit pemanggilan model.',
      },
    ],
  },
  {
    id: 'mobile-omni-commerce',
    name: 'Mobile App, SuperApp & IoT Telemetry',
    category: 'Aplikasi Konsumen & Perangkat Terhubung',
    description: 'Fokus pada performa aplikasi mobile (iOS/Android), sinkronisasi offline-first, konsumsi baterai rendah, serta telemetri perangkat real-time.',
    defaultSections: [
      {
        number: '01',
        title: 'Ringkasan Produk & Nilai Pengalaman Mobile',
        placeholder: 'Keunggulan utama pengalaman mobile native/lintas-platform dan skenario penggunaan di lapangan.',
      },
      {
        number: '02',
        title: 'Metrik Retensi, Crash-Free Rate & Performa Aplikasi',
        placeholder: 'Target Crash-Free Sessions >= 99.8%, waktu buka dingin (Cold Start) <= 1.5 detik, dan konversi funnel.',
      },
      {
        number: '03',
        title: 'Arsitektur Navigasi, Offline Sync & Push Notification',
        placeholder: 'Penyimpanan lokal SQLite/IndexedDB, resolusi konflik saat kembali online, dan pemicu notifikasi.',
      },
      {
        number: '04',
        title: 'Kontrak GraphQL/REST & Protokol Sinkronisasi Perangkat',
        placeholder: 'Kompresi payload jaringan seluler, manajemen sesi token biometrik, dan kompatibilitas versi OS.',
      },
      {
        number: '05',
        title: 'Kepatuhan App Store / Play Store & Rencana Rilis',
        placeholder: 'Persyaratan izin perangkat, pengujian perangkat fisik, dan mekanisme Feature Flag / OTA update.',
      },
    ],
  },
];
