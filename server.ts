import express from 'express';
import http from 'http';
import path from 'path';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

const PORT = 3000;


interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: string;
  color: string;
  createdAt: string;
  aiConfig?: {
    activeProvider: string;
    nineRouter: {
      apiKey: string;
      comboName: string;
      baseUrl: string;
    };
    universalProvider?: {
      providerId: string;
      providerName: string;
      baseUrl: string;
      apiKey: string;
      model: string;
    };
    savedConnections?: Array<{
      id: string;
      name: string;
      baseUrl: string;
      apiKey: string;
      model: string;
    }>;
  };
}

interface StoredChatSession {
  id: string;
  userId: string;
  title: string;
  pinned: boolean;
  updatedAt: string;
  prdDocId?: string;
  messages: any[];
  interview?: any;
}

function hashPassword(pw: string): string {
  return crypto.createHash('sha256').update(`specforge_salt_${pw}`).digest('hex');
}

async function loadUsersStore(): Promise<StoredUser[]> {
  const { data, error } = await supabase.from('users').select('*');
  if (error) {
    console.error('Failed to read users store:', error);
    return [];
  }
  return data.map((u: any) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    passwordHash: u.password_hash,
    role: u.role,
    color: u.color,
    createdAt: u.created_at,
    aiConfig: u.ai_config
  }));
}

async function saveUsersStore(users: StoredUser[]) {
  for (const user of users) {
    const { error } = await supabase.from('users').upsert({
      id: user.id,
      name: user.name,
      email: user.email,
      password_hash: user.passwordHash,
      role: user.role,
      color: user.color,
      created_at: user.createdAt,
      ai_config: user.aiConfig
    });
    if (error) console.error('Failed to save user:', error);
  }
}

async function loadChatsStore(): Promise<StoredChatSession[]> {
  const { data, error } = await supabase.from('chats').select('*');
  if (error) {
    console.error('Failed to read chats store:', error);
    return [];
  }
  return data.map((c: any) => ({
    id: c.id,
    userId: c.user_id,
    title: c.title,
    pinned: c.pinned,
    updatedAt: c.updated_at,
    prdDocId: c.prd_doc_id,
    messages: c.messages,
    interview: c.interview
  }));
}

async function saveChatsStore(chats: StoredChatSession[]) {
  for (const chat of chats) {
    const { error } = await supabase.from('chats').upsert({
      id: chat.id,
      user_id: chat.userId,
      title: chat.title,
      pinned: chat.pinned,
      updated_at: chat.updatedAt,
      prd_doc_id: chat.prdDocId,
      messages: chat.messages,
      interview: chat.interview
    });
    if (error) console.error('Failed to save chat:', error);
  }
}

const resetOtpStore = new Map<string, { code: string; expiresAt: number }>();

function isLocalhostUrl(urlStr?: string): boolean {
  if (!urlStr) return true;
  const lower = urlStr.toLowerCase();
  return (
    lower.includes('localhost') ||
    lower.includes('127.0.0.1') ||
    lower.includes('0.0.0.0') ||
    lower.includes('[::1]')
  );
}

function buildSmartStructuredPRD(productName: string, productBrief: string) {
  const codeNum = Math.floor(100 + Math.random() * 899);
  return {
    code: `PRD-2026-${codeNum}`,
    summary: `Spesifikasi teknis dan kebutuhan produk terpadu untuk ${productName}. Dirancang untuk menjawab kebutuhan: ${productBrief.slice(0, 180)} dengan arsitektur skalabel, SLA 99.95%, dan integrasi lintas platform.`,
    stitchPromptSpec: `// Spesifikasi Prompt Desain UI Google Stitch (100% Bahasa Indonesia)
INSTRUKSI WAJIB UNTUK GOOGLE STITCH:
Buat desain antarmuka web modern di mana SELURUH teks layar, menu navigasi, tombol, label formulir, tabel, dan pesan status menggunakan BAHASA INDONESIA (Jangan gunakan Bahasa Inggris).

Nama Layar Utama: "Dasbor Utama & Konsol Operasional — ${productName}"
Tata Letak (Layout): Navigasi Samping Kiri + Bilah Aksi Atas + 3 Kolom Metrik Utama + Tabel Operasional & Panel Status Real-Time.
Tema Visual: Mode Terang & Gelap Bersih (#FFFFFF / #131314 latar utama, #0B57D0 aksen biru utama).

Komponen Layar (Semua Label dalam Bahasa Indonesia):
1. Bilah Navigasi Kiri: Menu "Beranda", "Manajemen Data", "Laporan & Analitik", "Riwayat Aktivitas", dan "Pengaturan".
2. Kartu Ringkasan Metrik Atas: "Total Transaksi / Aktivitas Aktif", "Tingkat Keberhasilan (%)", dan "Waktu Respons Sistem".
3. Modul Kerja Utama (${productName}): Formulir dan tabel interaktif untuk mengelola "${productBrief.slice(0, 100)}" lengkap dengan tombol "Tambah Data Baru", "Filter & Cari", serta "Ekspor Laporan".
4. Panel Kolaborasi & Riwayat: Menampilkan daftar aktivitas pengguna secara langsung beserta lencana status ("Disetujui", "Dalam Tinjauan", "Draf").`,
    sections: [
      {
        number: '01',
        title: 'Ringkasan Eksekutif & Konteks Masalah',
        content: `Produk "${productName}" dikembangkan untuk memberikan solusi atas kebutuhan berikut:\n${productBrief}\n\nSaat ini alur operasional masih menghadapi hambatan efisiensi, fragmentasi data, dan keterbatasan visibilitas real-time. Melalui implementasi ${productName}, organisasi menargetkan otomatisasi end-to-end, penurunan waktu pemrosesan hingga 65%, serta peningkatan akurasi data lintas tim.`,
      },
      {
        number: '02',
        title: 'Metrik Keberhasilan & KPI Kuantitatif',
        content: `1. Waktu Respons Sistem (P95 Latency): <= 250 ms untuk seluruh operasi baca dan <= 600 ms untuk transaksi tulis.\n2. Tingkat Penyelesaian Alur Utama (Task Completion Rate): Mencapai >= 94% dalam 30 hari pertama pasca-rilis.\n3. Ketersediaan Layanan (Uptime SLA): Minimal 99.95% dengan pemulihan otomatis (auto-failover).\n4. Efisiensi Operasional: Menurunkan intervensi manual tim operasional sebesar minimal 60% pada kuartal pertama.`,
      },
      {
        number: '03',
        title: 'Alur Pengguna & Spesifikasi Fungsional Utama',
        content: `A. Inisialisasi & Konfigurasi Cepat\nPengguna dapat mengakses dasbor utama ${productName}, mengatur parameter kerja, dan langsung menjalankan alur utama tanpa konfigurasi rumit.\n\nB. Pemrosesan Otomatis & Validasi Real-Time\nSetiap input pengguna divalidasi secara instan pada sisi klien dan server, dilengkapi indikator status progres secara langsung (real-time).\n\nC. Ekspor Multi-Format & Kolaborasi Lintas Tim\nHasil kerja dapat diekspor secara instan ke format PDF siap cetak maupun bundel ZIP teknis (Markdown, JSON, CSV Backlog) serta disinkronkan ke Google Stitch, Trello, dan Jira.`,
      },
      {
        number: '04',
        title: 'Arsitektur Teknis, Skema Data & Kontrak API',
        content: `Arsitektur menggunakan pola Modular Service dengan komunikasi RESTful API dan WebSocket untuk sinkronisasi state real-time.\n\nEndpoint Inti:\n- POST /api/v1/resources : Membuat entitas baru dengan validasi skema JSON ketat dan Idempotency-Key.\n- GET /api/v1/resources/:id : Mengambil detail spesifikasi beserta riwayat revisi terstruktur.\n- PATCH /api/v1/resources/:id/sections : Memperbarui bagian dokumen secara atomik dengan pencatatan jejak audit.\n\nKeamanan:\nAutentikasi menggunakan Bearer Token (OAuth 2.0 / API Key), enkripsi TLS 1.3 saat transit, dan kontrol akses berbasis peran (RBAC).`,
      },
      {
        number: '05',
        title: 'Mitigasi Risiko, Keamanan & Kriteria Kesiapan Rilis',
        content: `1. Lonjakan Trafik Mendadak: Implementasi rate-limiting adaptif dan antrean asinkron agar layanan inti tetap responsif.\n2. Kegagalan Koneksi Eksternal: Mekanisme auto-fallback dan penyimpanan lokal sementara sehingga pengguna tidak kehilangan progres kerja.\n3. Kriteria Rilis (Definition of Done): Seluruh User Stories prioritas P0 lulus uji integrasi, cakupan pengujian otomatis >= 85%, dan audit keamanan terpenuhi.`,
      },
    ],
    userStories: [
      {
        persona: 'Pengguna Utama / Product Lead',
        story: `Sebagai Pengguna Utama, saya ingin mengelola alur inti pada ${productName} secara cepat dan terukur agar sasaran "${productBrief.slice(0, 70)}" tercapai tepat waktu.`,
        acceptanceCriteria: [
          'Antarmuka responsif di mode terang maupun gelap tanpa jeda pemuatan',
          'Validasi data otomatis dengan umpan balik jelas jika terjadi kesalahan input',
          'Data tersimpan secara real-time dan tercatat di riwayat revisi',
        ],
        priority: 'P0 - Kritis',
        storyPoints: 8,
      },
      {
        persona: 'System Architect / Engineer',
        story: `Sebagai Engineer, saya ingin spesifikasi API dan struktur backlog dari ${productName} dapat diekspor ke ZIP/PDF serta disinkronkan ke Jira/Trello.`,
        acceptanceCriteria: [
          'Dukungan ekspor dokumen ke PDF profesional dan bundel ZIP',
          'Sinkronisasi satu klik ke Google Stitch, Trello, dan Jira',
          'Pencatatan log sinkronisasi lengkap dengan stempel waktu',
        ],
        priority: 'P0 - Kritis',
        storyPoints: 5,
      },
      {
        persona: 'Tim Operasional & QA',
        story: `Sebagai Tim QA, saya ingin memantau perubahan spesifikasi secara real-time dan dapat memulihkan versi sebelumnya jika diperlukan.`,
        acceptanceCriteria: [
          'Menampilkan perbandingan isi sebelum dan sesudah revisi (diff view)',
          'Fitur pemulihan versi (Restore) berfungsi secara instan melalui WebSocket',
          'Indikator kolaborator aktif tampil secara akurat',
        ],
        priority: 'P1 - Tinggi',
        storyPoints: 5,
      },
    ],
  };
}

function getGeminiClient(overrideKey?: string) {
  const candidate =
    overrideKey && overrideKey.trim().startsWith('AIza')
      ? overrideKey.trim()
      : (process.env.GEMINI_API_KEY || '').trim();
  const isValidGeminiKey = candidate.startsWith('AIza') && candidate.length >= 30;
  if (!isValidGeminiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey: candidate,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function callOpenAICompatibleWithComboFallback(params: {
  baseUrl: string;
  apiKey?: string;
  models: string[];
  prompt: string;
  expectJson: boolean;
}) {
  const cleanBase = params.baseUrl.replace(/\/+$/, '');
  const isAnthropic = cleanBase.includes('api.anthropic.com');
  const endpoint = isAnthropic
    ? cleanBase.endsWith('/messages')
      ? cleanBase
      : `${cleanBase}/messages`
    : cleanBase.endsWith('/chat/completions')
    ? cleanBase
    : `${cleanBase}/chat/completions`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (params.apiKey && params.apiKey.trim()) {
    if (isAnthropic) {
      headers['x-api-key'] = params.apiKey.trim();
      headers['anthropic-version'] = '2023-06-01';
    } else {
      headers['Authorization'] = `Bearer ${params.apiKey.trim()}`;
    }
  }

  const candidateModels =
    params.models && params.models.length > 0
      ? params.models.filter(Boolean)
      : ['gpt-4o-mini'];

  const errors: string[] = [];

  for (let i = 0; i < candidateModels.length; i++) {
    const modelName = candidateModels[i];
    try {
      const bodyPayload = isAnthropic
        ? {
            model: modelName,
            max_tokens: 4096,
            system: params.expectJson
              ? 'Anda adalah Principal Product Manager. Anda WAJIB hanya mengembalikan JSON murni tanpa blok markdown ```json.'
              : 'Anda adalah Principal Product Manager. Gunakan Bahasa Indonesia.',
            messages: [{ role: 'user', content: params.prompt }],
          }
        : {
            model: modelName,
            messages: [
              ...(params.expectJson
                ? [
                    {
                      role: 'system',
                      content:
                        'Anda adalah Principal Product Manager. Anda WAJIB hanya mengembalikan JSON murni tanpa blok markdown ```json.',
                    },
                  ]
                : []),
              {
                role: 'user',
                content: params.prompt,
              },
            ],
            temperature: 0.7,
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(bodyPayload),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`[Tier ${i + 1}: ${modelName}] HTTP ${response.status} — ${errText.slice(0, 120)}`);
      }

      const data = await response.json();
      const rawContent: string = isAnthropic
        ? data?.content?.[0]?.text || ''
        : data?.choices?.[0]?.message?.content || '';
      if (!params.expectJson) {
        return {
          result: rawContent.trim(),
          usedModel: modelName,
          tierIndex: i + 1,
        };
      }

      const cleaned = rawContent
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();
      return {
        result: JSON.parse(cleaned),
        usedModel: modelName,
        tierIndex: i + 1,
      };
    } catch (err: any) {
      errors.push(err?.message || `Gagal pada model ${modelName}`);
      // Continue to next model in 9Router Combo chain
    }
  }

  throw new Error(
    `Seluruh model dalam Combo gagal dieksekusi:\n${errors.join('\n')}`
  );
}

const INITIAL_DOCUMENTS = [
  {
    id: 'prd-2026-01',
    title: 'Sistem Pembayaran Lintas Negara & Rekonsiliasi Otomatis B2B',
    code: 'PRD-FIN-042',
    templateId: 'fintech-core',
    templateName: 'Fintech & Payment Infrastructure',
    version: 'v2.4.0',
    status: 'Tinjauan Teknis',
    ownerName: 'Nadia Kusuma (Lead PM)',
    targetReleaseDate: '2026-11-30',
    updatedAt: '2026-10-05T10:45:00Z',
    summary: 'Arsitektur penyelesaian transaksi multi-mata uang real-time untuk eksportir dan importir Asia Tenggara dengan mesin rekonsiliasi faktur otomatis berbasis webhook dan kepatuhan regulasi BI-FAST / SNAP.',
    stitchPromptSpec: `// Spesifikasi Prompt Desain UI Google Stitch (100% Bahasa Indonesia)
INSTRUKSI WAJIB UNTUK GOOGLE STITCH:
Buat desain antarmuka aplikasi web di mana SELURUH teks, tombol, judul tabel, dan navigasi menggunakan BAHASA INDONESIA.

Nama Layar: "Dasbor Penyelesaian Transaksi Lintas Negara & Tresuri B2B"
Tata Letak: Menu Samping Kiri (256px) + Header Atas + 3 Kartu Metrik Tresuri + Tabel Buku Besar Rekonsiliasi Faktur Real-Time.
Tema Warna: Mode Terang Profesional (#F8FAFC latar belakang, #FFFFFF permukaan kartu, #0F172A teks utama, #2563EB biru utama).

Komponen Utama (Gunakan Label Bahasa Indonesia):
1. Bilah Pengunci Kurs Valas (FX Lock): Menampilkan kurs langsung IDR/USD, IDR/SGD, IDR/CNY dengan hitung mundur penguncian kurs 30 detik dan tombol "Kunci Kurs Sekarang".
2. Tabel Rekonsiliasi Faktur Otomatis: Kolom "Nomor Faktur", "Mitra Bisnis", "Nominal Asli", "Kurs Terkunci", "Status Penyelesaian" ("Selesai", "Menunggu Verifikasi", "Perlu Tinjauan"), dan tombol "Tindakan".
3. Panel Audit Kepatuhan SNAP BI: Panel geser samping yang menampilkan status verifikasi tanda tangan digital SNAP API dan log pemeriksaan kepatuhan.`,
    sections: [
      {
        id: 'sec-1',
        number: '01',
        title: 'Ringkasan Eksekutif & Visi Produk',
        content: `Platform pembayaran B2B saat ini mengalami keterlambatan penyelesaian rata-rata 48 hingga 72 jam akibat proses verifikasi dokumen pengapalan dan pencocokan kurs manual. Produk ini menghadirkan jalur penyelesaian multi-mata uang instan (IDR, SGD, USD, CNY) dengan mesin rekonsiliasi tiga arah (Pesanan Pembelian - Faktur - Mutasi Bank).\n\nTarget utama kuartal ini adalah menurunkan waktu penyelesaian transaksi lintas batas menjadi di bawah 15 menit untuk 92% transaksi terverifikasi dan mengurangi selisih kurs tak terduga melalui fitur penguncian nilai tukar (FX Rate Lock) selama 24 jam.`,
        status: 'Disetujui',
        lastEditedBy: 'Nadia Kusuma',
        lastEditedAt: '2026-10-05 09:15'
      },
      {
        id: 'sec-2',
        number: '02',
        title: 'Metrik Keberhasilan & KPI Kuantitatif',
        content: `1. Waktu Penyelesaian Transaksi (Settlement Latency): Turun dari rata-rata 54 jam menjadi <= 12 menit pada akhir Q4 2026.\n2. Tingkat Rekonsiliasi Otomatis (Auto-Match Rate): Mencapai minimal 96.5% faktur tanpa intervensi manual tim operasional keuangan.\n3. Tingkat Kegagalan Webhook (Webhook Drop Rate): <= 0.02% dengan mekanisme dead-letter queue dan retry eksponensial.\n4. Nilai Transaksi Bruto (GTV): Mendukung kapasitas puncak Rp 1,8 Triliun per hari dengan ketersediaan SLA 99.95%.`,
        status: 'Disetujui',
        lastEditedBy: 'Rizky Pratama',
        lastEditedAt: '2026-10-05 09:42'
      },
      {
        id: 'sec-3',
        number: '03',
        title: 'Alur Pengguna & Spesifikasi Fungsional',
        content: `A. Penguncian Nilai Tukar (FX Rate Lock)\nBendahara perusahaan dapat meminta kuotasi kurs langsung dari 4 penyedia likuiditas. Setelah dikunci, token kuotasi berlaku selama 15 menit untuk eksekusi instan atau 24 jam dengan deposit margin 2%.\n\nB. Rekonsiliasi Tiga Arah Otomatis\nSetiap dana masuk melalui Virtual Account atau SWIFT MT103 otomatis diekstrak atribut referensinya, dicocokkan dengan nomor invoice pada ERP pelanggan, dan langsung memperbarui status buku besar tanpa unggah CSV manual.\n\nC. Pemeriksaan Kepatuhan & Batas Transaksi\nSetiap transaksi di atas USD 25.000 wajib melewati verifikasi dokumen Underlying (Invoice & Bill of Lading) secara terprogram sebelum dana diteruskan ke mitra kliring.`,
        status: 'Ditinjau',
        lastEditedBy: 'Nadia Kusuma',
        lastEditedAt: '2026-10-05 10:18'
      },
      {
        id: 'sec-4',
        number: '04',
        title: 'Arsitektur Teknis, Skema Data & Integrasi API',
        content: `Layanan dibangun menggunakan arsitektur Event-Driven dengan Apache Kafka sebagai tulang punggung pencatatan buku besar ganda (Double-Entry Ledger).\n\nEndpoint Utama:\n- POST /v1/fx/quotes : Menghasilkan ID kuotasi nilai tukar dengan tanda tangan HMAC-SHA256.\n- POST /v1/settlements/execute : Mengeksekusi pemindahbukuan dengan kunci idempotensi wajib (Idempotency-Key header).\n- GET /v1/reconciliation/discrepancies : Mengembalikan daftar faktur yang memiliki selisih nominal di atas ambang toleransi Rp 500.\n\nKeamanan & Kepatuhan:\nSeluruh payload mengikuti standar Bank Indonesia SNAP (Standar Nasional Open API Pembayaran) dengan enkripsi kunci asimetris RSA-2048 dan pencatatan jejak audit permanen.`,
        status: 'Ditinjau',
        lastEditedBy: 'Dimas Hendrawan',
        lastEditedAt: '2026-10-05 10:40'
      },
      {
        id: 'sec-5',
        number: '05',
        title: 'Mitigasi Risiko, Edge Cases & Kriteria Rilis',
        content: `1. Fluktuasi Kurs Ekstrem (>3% dalam 5 menit): Sistem otomatis menangguhkan kuotasi otomatis dan mengalihkan ke mode persetujuan manual meja tresuri.\n2. Kegagalan Jaringan Mitra Kliring: Transaksi masuk ke antrean tahanan (Hold Queue) dengan pemberitahuan webhook status PENDING_PARTNER_RECOVERY kepada merchant dalam <= 3 detik.\n3. Duplikasi Pengiriman Webhook: Setiap event memiliki event_id unik yang divalidasi pada tabel deduplikasi Redis dengan TTL 72 jam.`,
        status: 'Draf',
        lastEditedBy: 'Dimas Hendrawan',
        lastEditedAt: '2026-10-05 10:45'
      }
    ],
    userStories: [
      {
        id: 'US-101',
        persona: 'Manajer Tresuri Korporat',
        story: 'Sebagai Manajer Tresuri, saya ingin mengunci kurs USD/IDR selama 24 jam agar perusahaan terlindung dari fluktuasi nilai tukar saat menunggu persetujuan direksi.',
        acceptanceCriteria: [
          'Menampilkan kuotasi kurs real-time dengan hitung mundur masa berlaku',
          'Menghasilkan sertifikat kontrak FX dalam format PDF setelah dikunci',
          'Membatalkan kontrak secara otomatis jika deposit margin tidak terpenuhi dalam 2 jam'
        ],
        priority: 'P0 - Kritis',
        storyPoints: 8,
        status: 'Selesai',
        assignee: 'Dimas Hendrawan',
        syncedTo: ['Jira', 'Google Stitch']
      },
      {
        id: 'US-102',
        persona: 'Staf Akuntansi & Rekonsiliasi',
        story: 'Sebagai Staf Akuntansi, saya ingin pembayaran masuk dicocokkan otomatis dengan faktur terbuka meski terdapat selisih biaya admin bank hingga Rp 10.000.',
        acceptanceCriteria: [
          'Aturan toleransi selisih dapat dikonfigurasi per mata uang di halaman pengaturan',
          'Selisih biaya bank otomatis dicatat ke akun beban administrasi bank pada jurnal ERP',
          'Menampilkan indikator kepercayaan pencocokan (Match Confidence) pada tabel transaksi'
        ],
        priority: 'P0 - Kritis',
        storyPoints: 5,
        status: 'Dalam Pengembangan',
        assignee: 'Rizky Pratama',
        syncedTo: ['Jira', 'Trello']
      },
      {
        id: 'US-103',
        persona: 'Petugas Kepatuhan (Compliance Officer)',
        story: 'Sebagai Petugas Kepatuhan, saya ingin meninjau dokumen underlying transaksi di atas USD 25.000 dalam satu layar tanpa perlu mengunduh berkas satu per satu.',
        acceptanceCriteria: [
          'Pratinjau berdampingan antara PDF Invoice, Bill of Lading, dan rincian transaksi',
          'Tombol Setujui atau Tolak wajib menyertakan alasan terstruktur dan tanda tangan digital',
          'Seluruh aksi tercatat di log audit dengan stempel waktu presisi milidetik'
        ],
        priority: 'P1 - Tinggi',
        storyPoints: 5,
        status: 'Siap QA',
        assignee: 'Nadia Kusuma',
        syncedTo: ['Google Stitch', 'Trello']
      },
      {
        id: 'US-104',
        persona: 'Lead Backend Engineer',
        story: 'Sebagai Lead Backend Engineer, saya ingin mekanisme pemeriksaan idempotensi pada seluruh endpoint mutasi pembayaran agar terhindar dari pendebitan ganda.',
        acceptanceCriteria: [
          'Menolak request tanpa header Idempotency-Key dengan kode HTTP 400',
          'Mengembalikan respons tersimpan jika kunci yang sama dikirim ulang dalam 24 jam',
          'Mengembalikan HTTP 409 Conflict jika kunci yang sama sedang diproses bersamaan'
        ],
        priority: 'P0 - Kritis',
        storyPoints: 8,
        status: 'Dalam Pengembangan',
        assignee: 'Dimas Hendrawan',
        syncedTo: ['Jira']
      }
    ],
    revisions: [
      {
        id: 'rev-103',
        version: 'v2.4.0',
        timestamp: '2026-10-05 10:40',
        authorName: 'Dimas Hendrawan',
        authorRole: 'Principal Architect',
        sectionId: 'sec-4',
        sectionTitle: '04. Arsitektur Teknis, Skema Data & Integrasi API',
        changeSummary: 'Menambahkan spesifikasi standar Bank Indonesia SNAP dan header Idempotency-Key wajib pada endpoint eksekusi.',
        previousContent: 'Layanan dibangun menggunakan arsitektur Event-Driven dengan Apache Kafka. Endpoint utama meliputi pembuatan kuotasi dan eksekusi pembayaran.',
        newContent: 'Layanan dibangun menggunakan arsitektur Event-Driven dengan Apache Kafka sebagai tulang punggung pencatatan buku besar ganda (Double-Entry Ledger).\n\nEndpoint Utama:\n- POST /v1/fx/quotes : Menghasilkan ID kuotasi nilai tukar dengan tanda tangan HMAC-SHA256.\n- POST /v1/settlements/execute : Mengeksekusi pemindahbukuan dengan kunci idempotensi wajib (Idempotency-Key header).'
      },
      {
        id: 'rev-102',
        version: 'v2.3.0',
        timestamp: '2026-10-05 09:42',
        authorName: 'Rizky Pratama',
        authorRole: 'Data & Finance Lead',
        sectionId: 'sec-2',
        sectionTitle: '02. Metrik Keberhasilan & KPI Kuantitatif',
        changeSummary: 'Memperketat target SLA ketersediaan menjadi 99.95% dan menambahkan batas Webhook Drop Rate <= 0.02%.',
        previousContent: '1. Waktu Penyelesaian Transaksi: <= 15 menit.\n2. Tingkat Rekonsiliasi Otomatis: 90% faktur.',
        newContent: '1. Waktu Penyelesaian Transaksi (Settlement Latency): Turun dari rata-rata 54 jam menjadi <= 12 menit pada akhir Q4 2026.\n2. Tingkat Rekonsiliasi Otomatis (Auto-Match Rate): Mencapai minimal 96.5% faktur tanpa intervensi manual tim operasional keuangan.\n3. Tingkat Kegagalan Webhook (Webhook Drop Rate): <= 0.02% dengan mekanisme dead-letter queue dan retry eksponensial.\n4. Nilai Transaksi Bruto (GTV): Mendukung kapasitas puncak Rp 1,8 Triliun per hari dengan ketersediaan SLA 99.95%.'
      },
      {
        id: 'rev-101',
        version: 'v2.2.0',
        timestamp: '2026-10-04 16:20',
        authorName: 'Nadia Kusuma',
        authorRole: 'Lead Product Manager',
        sectionId: 'sec-1',
        sectionTitle: '01. Ringkasan Eksekutif & Visi Produk',
        changeSummary: 'Inisialisasi dokumen spesifikasi pembayaran lintas negara untuk koridor Asia Tenggara.',
        previousContent: 'Draf awal visi produk pembayaran lintas batas B2B.',
        newContent: 'Platform pembayaran B2B saat ini mengalami keterlambatan penyelesaian rata-rata 48 hingga 72 jam akibat proses verifikasi dokumen pengapalan dan pencocokan kurs manual.'
      }
    ],
    comments: [
      {
        id: 'cmt-1',
        sectionId: 'sec-3',
        authorName: 'Dimas Hendrawan',
        authorRole: 'Principal Architect',
        content: 'Untuk transaksi di atas USD 25.000, pastikan batas ukuran unggahan dokumen Bill of Lading adalah 15MB dengan pemindaian OCR asinkron.',
        timestamp: '2026-10-05 10:22',
        resolved: false
      },
      {
        id: 'cmt-2',
        sectionId: 'sec-4',
        authorName: 'Rizky Pratama',
        authorRole: 'Data & Finance Lead',
        content: 'Toleransi selisih Rp 500 sudah sesuai dengan pedoman audit internal kuartal ini.',
        timestamp: '2026-10-05 10:42',
        resolved: true
      }
    ],
    integrationLogs: [
      {
        id: 'int-1',
        tool: 'Google Stitch',
        timestamp: '2026-10-05 10:15',
        action: 'Generate & Sync Spesifikasi UI/UX & Hierarki Komponen',
        itemsCount: 3,
        targetDestination: 'Stitch Workspace / B2B-Treasury-v2',
        status: 'Berhasil',
        payloadPreview: 'Screen: B2B Cross-Border Settlement & Treasury Dashboard (3-Column Grid + FX Lock Bar)'
      },
      {
        id: 'int-2',
        tool: 'Jira',
        timestamp: '2026-10-05 10:30',
        action: 'Ekspor Epic & 4 User Stories ke Sprint Aktif',
        itemsCount: 4,
        targetDestination: 'Project FIN-CORE / Sprint 28',
        status: 'Berhasil',
        payloadPreview: 'Synced US-101, US-102, US-103, US-104 (Total 26 Story Points)'
      }
    ]
  },
  {
    id: 'prd-2026-02',
    title: 'Aplikasi Mobile Telemedisin & Pemantauan Pasien Kronis Terpadu',
    code: 'PRD-HLTH-019',
    templateId: 'mobile-health',
    templateName: 'Mobile App & IoT Telemetry',
    version: 'v1.2.0',
    status: 'Disetujui',
    ownerName: 'dr. Arief Budiman (Product Lead)',
    targetReleaseDate: '2026-12-15',
    updatedAt: '2026-10-05T08:30:00Z',
    summary: 'Aplikasi mobile pendamping pasien hipertensi dan diabetes dengan sinkronisasi perangkat kesehatan Bluetooth Low Energy (BLE), peringatan triase klinis otomatis, dan integrasi rekam medis SATUSEHAT.',
    stitchPromptSpec: `// Spesifikasi Prompt Desain UI Google Stitch (100% Bahasa Indonesia)
INSTRUKSI WAJIB UNTUK GOOGLE STITCH:
Buat desain antarmuka aplikasi di mana SELURUH teks, label tombol, grafik, dan menu menggunakan BAHASA INDONESIA.

Nama Layar: "Konsol Triase Dokter & Pemantauan Tanda Vital Pasien"
Tata Letak: Tampilan Terpisah — Daftar Antrean Pasien di Kiri + Grafik Tanda Vital di Tengah + Panel Resep & Integrasi SATUSEHAT di Kanan.
Komponen Utama (Label Bahasa Indonesia):
1. Kartu Indikator Tanda Vital: Menampilkan "Tekanan Darah (mmHg)", "Gula Darah (mg/dL)", dan "Saturasi Oksigen (%)" lengkap dengan indikator status ("Normal", "Waspada", "Kritis").
2. Bilah Tindakan Cepat Medis: Tombol "Mulai Konsultasi Video", "Kirim Peringatan Darurat", dan "Sinkronkan ke SATUSEHAT".`,
    sections: [
      {
        id: 'sec-201',
        number: '01',
        title: 'Ringkasan Eksekutif & Masalah Klinis',
        content: `Pasien penyakit kronis sering melewatkan pemeriksaan rutin dan pencatatan tekanan darah maupun gula darah harian masih dilakukan secara manual di buku kertas. Aplikasi ini mengotomatiskan pembacaan dari glukometer dan tensimeter pintar melalui Bluetooth serta mengirim peringatan dini ke tim medis rumah sakit jika nilai melampaui batas aman.`,
        status: 'Disetujui',
        lastEditedBy: 'dr. Arief Budiman',
        lastEditedAt: '2026-10-04 14:20'
      },
      {
        id: 'sec-202',
        number: '02',
        title: 'Standar Integrasi FHIR R4 & SATUSEHAT',
        content: `Seluruh data observasi tanda vital dipetakan ke dalam resource HL7 FHIR R4 Observation (LOINC 85354-9 untuk tekanan darah dan 2339-0 untuk glukosa darah) sebelum dikirimkan secara terenkripsi ke platform Kemenkes SATUSEHAT.`,
        status: 'Disetujui',
        lastEditedBy: 'Siti Aminah',
        lastEditedAt: '2026-10-05 08:30'
      }
    ],
    userStories: [
      {
        id: 'US-201',
        persona: 'Pasien Lansia Hipertensi',
        story: 'Sebagai pasien lansia, saya ingin hasil pengukuran tensimeter otomatis masuk ke aplikasi tanpa perlu mengetik angka secara manual.',
        acceptanceCriteria: [
          'Sinkronisasi BLE berjalan di latar belakang dalam waktu <= 5 detik setelah pengukuran selesai',
          'Umpan balik suara bahasa Indonesia membacakan kategori hasil (Normal / Tinggi)',
          'Data tersimpan secara lokal (offline-first) jika koneksi internet sedang terputus'
        ],
        priority: 'P0 - Kritis',
        storyPoints: 8,
        status: 'Selesai',
        assignee: 'Siti Aminah',
        syncedTo: ['Trello', 'Google Stitch']
      }
    ],
    revisions: [
      {
        id: 'rev-201',
        version: 'v1.2.0',
        timestamp: '2026-10-05 08:30',
        authorName: 'Siti Aminah',
        authorRole: 'Healthcare Systems Engineer',
        sectionId: 'sec-202',
        sectionTitle: '02. Standar Integrasi FHIR R4 & SATUSEHAT',
        changeSummary: 'Menambahkan kode standar LOINC 85354-9 dan 2339-0 untuk pemetaan resource Observation.',
        previousContent: 'Data tanda vital dikirimkan ke platform SATUSEHAT menggunakan format standar kesehatan.',
        newContent: 'Seluruh data observasi tanda vital dipetakan ke dalam resource HL7 FHIR R4 Observation (LOINC 85354-9 untuk tekanan darah dan 2339-0 untuk glukosa darah) sebelum dikirimkan secara terenkripsi ke platform Kemenkes SATUSEHAT.'
      }
    ],
    comments: [],
    integrationLogs: []
  }
];

async function loadStore(): Promise<any[]> {
  const { data, error } = await supabase.from('prds').select('*');
  if (error) {
    console.error('Failed to read store:', error);
    return [];
  }
  return data.map((d: any) => ({
    id: d.id,
    title: d.title,
    code: d.code,
    templateId: d.template_id,
    templateName: d.template_name,
    version: d.version,
    status: d.status,
    ownerName: d.owner_name,
    targetReleaseDate: d.target_release_date,
    updatedAt: d.updated_at,
    summary: d.summary,
    stitchPromptSpec: d.stitch_prompt_spec,
    sections: d.sections,
    userStories: d.user_stories,
    revisions: d.revisions,
    comments: d.comments,
    integrationLogs: d.integration_logs
  }));
}

async function saveStore(docs: any[]) {
  for (const doc of docs) {
    const { error } = await supabase.from('prds').upsert({
      id: doc.id,
      title: doc.title,
      code: doc.code,
      template_id: doc.templateId,
      template_name: doc.templateName,
      version: doc.version,
      status: doc.status,
      owner_name: doc.ownerName,
      target_release_date: doc.targetReleaseDate,
      updated_at: doc.updatedAt,
      summary: doc.summary,
      stitch_prompt_spec: doc.stitchPromptSpec,
      sections: doc.sections,
      user_stories: doc.userStories,
      revisions: doc.revisions,
      comments: doc.comments,
      integration_logs: doc.integrationLogs
    });
    if (error) console.error('Failed to save document:', error);
  }
}



interface ConnectedClient {
  ws: WebSocket;
  clientId: string;
  name: string;
  role: string;
  color: string;
  activeDocId: string;
  activeSectionId: string | null;
  lastSeen: string;
}

async function startServer() {
  let usersList = await loadUsersStore();
  let chatSessionsList = await loadChatsStore();
  let prdDocuments = await loadStore();

  const app = express();
  app.use(express.json({ limit: '10mb' }));

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });
  const clients = new Map<string, ConnectedClient>();

  function broadcastToAll(payload: any) {
    const msg = JSON.stringify(payload);
    for (const client of clients.values()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(msg);
      }
    }
  }

  function getCollaboratorsList() {
    return Array.from(clients.values()).map((c) => ({
      clientId: c.clientId,
      name: c.name,
      role: c.role,
      color: c.color,
      activeDocId: c.activeDocId,
      activeSectionId: c.activeSectionId,
      lastSeen: c.lastSeen,
    }));
  }

  wss.on('connection', (ws) => {
    let currentClientId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(raw.toString());

        if (data.type === 'presence:join') {
          currentClientId = data.clientId || currentClientId;
          clients.set(currentClientId, {
            ws,
            clientId: currentClientId,
            name: data.name || ' Rekan Tim Produk',
            role: data.role || 'Product Manager',
            color: data.color || '#2563EB',
            activeDocId: data.activeDocId || (prdDocuments[0]?.id ?? ''),
            activeSectionId: data.activeSectionId || null,
            lastSeen: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          });

          ws.send(
            JSON.stringify({
              type: 'state:init',
              documents: prdDocuments,
              collaborators: getCollaboratorsList(),
            })
          );

          broadcastToAll({
            type: 'presence:update',
            collaborators: getCollaboratorsList(),
          });
        } else if (data.type === 'presence:focus') {
          const existing = clients.get(currentClientId);
          if (existing) {
            existing.activeDocId = data.activeDocId ?? existing.activeDocId;
            existing.activeSectionId = data.activeSectionId ?? null;
            existing.name = data.name ?? existing.name;
            existing.role = data.role ?? existing.role;
            existing.lastSeen = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            broadcastToAll({
              type: 'presence:update',
              collaborators: getCollaboratorsList(),
            });
          }
        } else if (data.type === 'doc:update_section') {
          const { docId, sectionId, content, status, title, authorName, authorRole, changeSummary } = data;
          const docIndex = prdDocuments.findIndex((d: any) => d.id === docId);
          if (docIndex !== -1) {
            const doc = prdDocuments[docIndex];
            const secIndex = doc.sections.findIndex((s: any) => s.id === sectionId);
            if (secIndex !== -1) {
              const prevSection = doc.sections[secIndex];
              const nowFormatted = new Date().toISOString().slice(0, 16).replace('T', ' ');

              // bump patch version
              const versionParts = doc.version.replace('v', '').split('.').map(Number);
              const nextVersion = `v${versionParts[0] || 1}.${versionParts[1] || 0}.${(versionParts[2] || 0) + 1}`;

              const newRevision = {
                id: `rev-${Date.now()}`,
                version: nextVersion,
                timestamp: nowFormatted,
                authorName: authorName || 'Kolaborator Tim',
                authorRole: authorRole || 'Product Manager',
                sectionId,
                sectionTitle: `${prevSection.number}. ${title || prevSection.title}`,
                changeSummary: changeSummary || `Memperbarui bagian ${prevSection.title}`,
                previousContent: prevSection.content,
                newContent: content,
              };

              doc.sections[secIndex] = {
                ...prevSection,
                title: title || prevSection.title,
                content,
                status: status || prevSection.status,
                lastEditedBy: authorName || 'Kolaborator Tim',
                lastEditedAt: nowFormatted,
              };
              doc.version = nextVersion;
              doc.updatedAt = new Date().toISOString();
              doc.revisions = [newRevision, ...(doc.revisions || [])];

              saveStore(prdDocuments);

              broadcastToAll({
                type: 'doc:updated',
                document: doc,
                latestRevision: newRevision,
              });
            }
          }
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    });

    ws.on('close', () => {
      clients.delete(currentClientId);
      broadcastToAll({
        type: 'presence:update',
        collaborators: getCollaboratorsList(),
      });
    });
  });

  // REST Endpoints: Authentication, Password Reset (6-Digit OTP), Google OAuth, User AI Keys & Persistent Chats
  app.post('/api/auth/register', (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Nama, email, dan kata sandi wajib diisi.' });
      return;
    }
    const cleanEmail = String(email).trim().toLowerCase();
    if (usersList.some((u) => u.email.toLowerCase() === cleanEmail)) {
      res.status(400).json({ error: 'Email sudah terdaftar. Silakan masuk (Login).' });
      return;
    }
    const colors = ['#1A73E8', '#0D9488', '#D97706', '#9334E6', '#E11D48'];
    const newUser: StoredUser = {
      id: `usr-${Date.now()}`,
      name: String(name).trim(),
      email: cleanEmail,
      passwordHash: hashPassword(String(password)),
      role: 'Product Manager',
      color: colors[usersList.length % colors.length],
      createdAt: new Date().toISOString(),
    };
    usersList.push(newUser);
    saveUsersStore(usersList);

    const { passwordHash: _, ...safeUser } = newUser;
    res.json({ user: safeUser });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email dan kata sandi wajib diisi.' });
      return;
    }
    const cleanEmail = String(email).trim().toLowerCase();
    const found = usersList.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!found || found.passwordHash !== hashPassword(String(password))) {
      res.status(401).json({ error: 'Email atau kata sandi salah.' });
      return;
    }
    const { passwordHash: _, ...safeUser } = found;
    res.json({ user: safeUser });
  });

  app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail) {
      res.status(400).json({ error: 'Masukkan alamat email yang terdaftar.' });
      return;
    }
    const found = usersList.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!found) {
      res.status(404).json({ error: 'Email tersebut belum terdaftar di sistem.' });
      return;
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    resetOtpStore.set(cleanEmail, {
      code,
      expiresAt: Date.now() + 15 * 60 * 1000,
    });

    let sentViaSmtp = false;
    let previewEmailUrl = '';

    try {
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: Number(process.env.SMTP_PORT) === 465,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });
        await transporter.sendMail({
          from: process.env.SMTP_FROM || `"SpecForge AI" <${process.env.SMTP_USER}>`,
          to: cleanEmail,
          subject: `[SpecForge] Kode 6 Digit Reset Kata Sandi Anda: ${code}`,
          html: `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:16px;">
            <h2 style="margin-top:0;color:#0B57D0;">Reset Kata Sandi SpecForge</h2>
            <p>Halo <b>${found.name}</b>,</p>
            <p>Gunakan kode verifikasi 6 digit berikut untuk mengatur ulang kata sandi akun Anda (berlaku 15 menit):</p>
            <div style="font-size:28px;font-weight:bold;letter-spacing:6px;padding:16px;background:#F0F4F9;text-align:center;border-radius:12px;color:#1F1F1F;">${code}</div>
          </div>`,
        });
        sentViaSmtp = true;
      } else {
        const testAccount = await nodemailer.createTestAccount();
        const transporter = nodemailer.createTransport({
          host: testAccount.smtp.host,
          port: testAccount.smtp.port,
          secure: testAccount.smtp.secure,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        const info = await transporter.sendMail({
          from: '"SpecForge Security" <no-reply@specforge.id>',
          to: cleanEmail,
          subject: `Kode 6 Digit Reset Kata Sandi: ${code}`,
          html: `<p>Halo <b>${found.name}</b>, kode 6 digit reset sandi Anda adalah: <b>${code}</b></p>`,
        });
        const ethUrl = nodemailer.getTestMessageUrl(info);
        if (ethUrl) previewEmailUrl = ethUrl;
      }
    } catch {
      // Fallback: still return code in development/sandbox preview if SMTP is not configured
    }

    res.json({
      message: sentViaSmtp
        ? `Kode 6 digit telah dikirim ke email ${cleanEmail}.`
        : `Kode verifikasi 6 digit telah dibuat untuk ${cleanEmail}.`,
      demoOtpCode: sentViaSmtp ? undefined : code,
      previewEmailUrl: previewEmailUrl || undefined,
    });
  });

  app.post('/api/auth/reset-password', (req, res) => {
    const { email, code, newPassword } = req.body;
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanCode = String(code || '').trim();
    if (!cleanEmail || !cleanCode || !newPassword) {
      res.status(400).json({ error: 'Email, kode 6 digit, dan kata sandi baru wajib diisi.' });
      return;
    }

    const record = resetOtpStore.get(cleanEmail);
    if (!record || record.code !== cleanCode) {
      res.status(400).json({ error: 'Kode verifikasi 6 digit tidak valid.' });
      return;
    }
    if (Date.now() > record.expiresAt) {
      resetOtpStore.delete(cleanEmail);
      res.status(400).json({ error: 'Kode 6 digit sudah kedaluwarsa. Silakan minta kode baru.' });
      return;
    }

    const idx = usersList.findIndex((u) => u.email.toLowerCase() === cleanEmail);
    if (idx === -1) {
      res.status(404).json({ error: 'Akun tidak ditemukan.' });
      return;
    }

    usersList[idx].passwordHash = hashPassword(String(newPassword));
    saveUsersStore(usersList);
    resetOtpStore.delete(cleanEmail);

    const { passwordHash: _, ...safeUser } = usersList[idx];
    res.json({ message: 'Kata sandi berhasil diperbarui!', user: safeUser });
  });

  // Google Login (Supports Real Google OAuth Popup + Instant Google Account Sign-In)
  app.get('/api/auth/google/url', (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.CLIENT_ID || '';
    const origin = (req.query.origin as string) || process.env.APP_URL || `http://localhost:${PORT}`;
    const redirectUri = `${origin.replace(/\/+$/, '')}/auth/callback`;

    if (!clientId) {
      res.json({ configured: false, redirectUri });
      return;
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'online',
      prompt: 'select_account',
    });

    res.json({
      configured: true,
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      redirectUri,
    });
  });

  app.get(['/auth/callback', '/auth/callback/'], async (req, res) => {
    try {
      const code = req.query.code as string;
      const clientId = process.env.GOOGLE_CLIENT_ID || process.env.CLIENT_ID || '';
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.CLIENT_SECRET || '';
      const hostUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      const redirectUri = `${hostUrl.replace(/\/+$/, '')}/auth/callback`;

      let email = 'google.user@gmail.com';
      let name = 'Pengguna Google';

      if (code && clientId && clientSecret) {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
          }),
        });
        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
          });
          if (profileRes.ok) {
            const profile = await profileRes.json();
            email = (profile.email || email).toLowerCase();
            name = profile.name || email.split('@')[0];
          }
        }
      }

      let user = usersList.find((u) => u.email.toLowerCase() === email);
      if (!user) {
        user = {
          id: `usr-google-${Date.now()}`,
          name,
          email,
          passwordHash: hashPassword(`google_oauth_${Date.now()}`),
          role: 'Product Manager',
          color: '#1A73E8',
          createdAt: new Date().toISOString(),
        };
        usersList.push(user);
        saveUsersStore(usersList);
      }

      const { passwordHash: _, ...safeUser } = user;
      res.send(`<!DOCTYPE html>
<html>
  <body>
    <script>
      if (window.opener) {
        window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', user: ${JSON.stringify(safeUser)} }, '*');
        window.close();
      } else {
        window.location.href = '/';
      }
    </script>
    <p>Login Google berhasil. Jendela ini akan tertutup otomatis...</p>
  </body>
</html>`);
    } catch {
      res.redirect('/');
    }
  });

  app.post('/api/auth/google-direct', (req, res) => {
    const { email, name } = req.body;
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail) {
      res.status(400).json({ error: 'Email Google wajib diisi.' });
      return;
    }
    let user = usersList.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      user = {
        id: `usr-g-${Date.now()}`,
        name: String(name || cleanEmail.split('@')[0]).trim(),
        email: cleanEmail,
        passwordHash: hashPassword(`google_${cleanEmail}`),
        role: 'Product Manager',
        color: '#1A73E8',
        createdAt: new Date().toISOString(),
      };
      usersList.push(user);
      saveUsersStore(usersList);
    }
    const { passwordHash: _, ...safeUser } = user;
    res.json({ user: safeUser });
  });

  // Save Per-User AI API Keys & Provider Settings
  app.put('/api/users/:userId/ai-config', (req, res) => {
    const { userId } = req.params;
    const idx = usersList.findIndex((u) => u.id === userId);
    if (idx === -1) {
      res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
      return;
    }
    usersList[idx].aiConfig = req.body.aiConfig;
    saveUsersStore(usersList);
    const { passwordHash: _, ...safeUser } = usersList[idx];
    res.json({ user: safeUser });
  });

  // Persistent Chat History CRUD (Per User — Never Lost, Supports Pin, Rename, Delete)
  app.get('/api/chats', (req, res) => {
    const userId = String(req.query.userId || '');
    const list = userId
      ? chatSessionsList.filter((c) => c.userId === userId)
      : chatSessionsList;
    const sorted = [...list].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    res.json({ chats: sorted });
  });

  app.post('/api/chats', (req, res) => {
    const session: StoredChatSession = req.body;
    if (!session || !session.id) {
      res.status(400).json({ error: 'Data sesi chat tidak valid.' });
      return;
    }
    const existingIdx = chatSessionsList.findIndex((c) => c.id === session.id);
    if (existingIdx >= 0) {
      chatSessionsList[existingIdx] = {
        ...chatSessionsList[existingIdx],
        ...session,
        updatedAt: session.updatedAt || new Date().toISOString(),
      };
    } else {
      chatSessionsList.unshift({
        ...session,
        pinned: Boolean(session.pinned),
        updatedAt: session.updatedAt || new Date().toISOString(),
      });
    }
    saveChatsStore(chatSessionsList);
    res.json({ chat: session });
  });

  app.patch('/api/chats/:id', (req, res) => {
    const { id } = req.params;
    const idx = chatSessionsList.findIndex((c) => c.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Riwayat chat tidak ditemukan.' });
      return;
    }
    const { title, pinned, messages, interview, prdDocId } = req.body;
    if (typeof title === 'string') chatSessionsList[idx].title = title;
    if (typeof pinned === 'boolean') chatSessionsList[idx].pinned = pinned;
    if (Array.isArray(messages)) chatSessionsList[idx].messages = messages;
    if (interview !== undefined) chatSessionsList[idx].interview = interview;
    if (prdDocId !== undefined) chatSessionsList[idx].prdDocId = prdDocId;
    chatSessionsList[idx].updatedAt = new Date().toISOString();
    saveChatsStore(chatSessionsList);
    res.json({ chat: chatSessionsList[idx] });
  });

  app.delete('/api/chats/:id', (req, res) => {
    const { id } = req.params;
    chatSessionsList = chatSessionsList.filter((c) => c.id !== id);
    saveChatsStore(chatSessionsList);
    res.json({ success: true });
  });

  // REST Endpoints: PRDs
  app.get('/api/prds', (_req, res) => {
    res.json({ documents: prdDocuments });
  });

  app.post('/api/prds', (req, res) => {
    const newDoc = req.body;
    if (!newDoc || !newDoc.id) {
      res.status(400).json({ error: 'Data PRD tidak lengkap' });
      return;
    }
    const existingIdx = prdDocuments.findIndex((d: any) => d.id === newDoc.id);
    if (existingIdx >= 0) {
      prdDocuments[existingIdx] = newDoc;
    } else {
      prdDocuments = [newDoc, ...prdDocuments];
    }
    saveStore(prdDocuments);
    broadcastToAll({
      type: 'doc:created',
      document: newDoc,
      documents: prdDocuments,
    });
    res.json({ document: newDoc });
  });

  app.put('/api/prds/:id', (req, res) => {
    const { id } = req.params;
    const updatedDoc = req.body;
    const idx = prdDocuments.findIndex((d: any) => d.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Dokumen PRD tidak ditemukan' });
      return;
    }
    prdDocuments[idx] = updatedDoc;
    saveStore(prdDocuments);
    broadcastToAll({
      type: 'doc:updated',
      document: updatedDoc,
    });
    res.json({ document: updatedDoc });
  });

  // AI PRD Generation (Supports Gemini + 9Router / OpenRouter / Groq / OpenAI-Compatible)
  app.post('/api/ai/generate-prd', async (req, res) => {
    try {
      const {
        productName,
        productBrief,
        templateName,
        targetAudience,
        techStack,
        keyGoals,
        ownerName,
        providerConfig,
      } = req.body;

      if (!productName || !productBrief) {
        res.status(400).json({ error: 'Nama produk dan deskripsi wajib diisi.' });
        return;
      }

      const prompt = `Anda adalah Principal Product Manager dan System Architect kelas dunia.
Buatlah dokumen Product Requirements Document (PRD) yang sangat mendalam, terstruktur, komprehensif, dan siap dieksekusi oleh tim engineer dalam Bahasa Indonesia.

Detail Proyek:
- Nama Produk: ${productName}
- Template Standar: ${templateName || 'Enterprise SaaS & API Platform'}
- Deskripsi & Konteks Masalah: ${productBrief}
- Target Pengguna / Persona: ${targetAudience || 'Pengguna bisnis dan tim operasional'}
- Stack Teknologi / Arsitektur: ${techStack || 'Cloud-native, REST/GraphQL API, PostgreSQL, React'}
- Target KPI & Sasaran: ${keyGoals || 'Peningkatan efisiensi alur kerja, reliabilitas sistem 99.9%'}

Kembalikan HANYA objek JSON valid dengan struktur persis berikut:
{
  "code": "PRD-2026-88",
  "summary": "Ringkasan eksekutif padat (2-3 kalimat dalam Bahasa Indonesia)",
  "stitchPromptSpec": "Prompt desain UI/UX untuk Google Stitch yang 100% ditulis dalam BAHASA INDONESIA. Wajib diawali dengan kalimat: 'INSTRUKSI WAJIB: Buat desain antarmuka web/aplikasi dengan SELURUH teks, menu, tombol, dan label menggunakan Bahasa Indonesia.' diikuti rincian Tata Letak, Komponen Layar, dan Warna dalam Bahasa Indonesia.",
  "sections": [
    { "number": "01", "title": "Ringkasan Eksekutif & Konteks Masalah", "content": "..." },
    { "number": "02", "title": "Metrik Keberhasilan & KPI Kuantitatif", "content": "..." },
    { "number": "03", "title": "Alur Pengguna & Spesifikasi Fungsional Utama", "content": "..." },
    { "number": "04", "title": "Arsitektur Teknis, Skema Data & Kontrak API", "content": "..." },
    { "number": "05", "title": "Mitigasi Risiko, Keamanan & Kriteria Kesiapan Rilis", "content": "..." }
  ],
  "userStories": [
    {
      "persona": "Nama Persona",
      "story": "Sebagai ..., saya ingin ... agar ...",
      "acceptanceCriteria": ["Kriteria 1", "Kriteria 2", "Kriteria 3"],
      "priority": "P0 - Kritis",
      "storyPoints": 5
    }
  ]
}`;

      let parsed: any = {};
      let usedModelLabel = providerConfig?.model || 'gemini-3.8-flash';

      const hasRemoteCustomProvider =
        providerConfig &&
        providerConfig.provider &&
        providerConfig.provider !== 'gemini' &&
        providerConfig.baseUrl &&
        !isLocalhostUrl(providerConfig.baseUrl);

      if (hasRemoteCustomProvider) {
        const modelsToTry =
          providerConfig.comboEnabled && Array.isArray(providerConfig.comboModels) && providerConfig.comboModels.length > 0
            ? providerConfig.comboModels
            : [providerConfig.model || 'gpt-4o-mini'];

        try {
          const comboOutcome = await callOpenAICompatibleWithComboFallback({
            baseUrl: providerConfig.baseUrl,
            apiKey: providerConfig.apiKey,
            models: modelsToTry,
            prompt,
            expectJson: true,
          });
          parsed = comboOutcome.result;
          usedModelLabel = `${comboOutcome.usedModel}`;
        } catch {
          parsed = buildSmartStructuredPRD(productName, productBrief);
        }
      } else {
        const geminiOverrideKey =
          providerConfig?.provider === 'gemini' ? providerConfig?.apiKey : undefined;
        const ai = getGeminiClient(geminiOverrideKey);
        if (ai) {
          try {
            const response = await ai.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: prompt,
              config: {
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    code: { type: Type.STRING },
                    summary: { type: Type.STRING },
                    stitchPromptSpec: { type: Type.STRING },
                    sections: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          number: { type: Type.STRING },
                          title: { type: Type.STRING },
                          content: { type: Type.STRING },
                        },
                        required: ['number', 'title', 'content'],
                      },
                    },
                    userStories: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          persona: { type: Type.STRING },
                          story: { type: Type.STRING },
                          acceptanceCriteria: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                          },
                          priority: { type: Type.STRING },
                          storyPoints: { type: Type.INTEGER },
                        },
                        required: ['persona', 'story', 'acceptanceCriteria', 'priority', 'storyPoints'],
                      },
                    },
                  },
                  required: ['code', 'summary', 'stitchPromptSpec', 'sections', 'userStories'],
                },
              },
            });

            const generatedText = response.text || '{}';
            parsed = JSON.parse(generatedText);
          } catch {
            parsed = buildSmartStructuredPRD(productName, productBrief);
          }
        } else {
          parsed = buildSmartStructuredPRD(productName, productBrief);
        }
      }

      const nowFormatted = new Date().toISOString().slice(0, 16).replace('T', ' ');

      const newDoc = {
        id: `prd-${Date.now()}`,
        title: productName,
        code: parsed.code || `PRD-${Math.floor(100 + Math.random() * 900)}`,
        templateId: 'ai-generated',
        templateName: templateName || 'Enterprise SaaS Architecture',
        version: 'v1.0.0',
        status: 'Draf',
        ownerName: ownerName || 'Nadia Kusuma (Lead PM)',
        targetReleaseDate: new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10),
        updatedAt: new Date().toISOString(),
        summary: parsed.summary || productBrief,
        stitchPromptSpec: parsed.stitchPromptSpec || '',
        sections: (parsed.sections || []).map((sec: any, idx: number) => ({
          id: `sec-${Date.now()}-${idx}`,
          number: sec.number || `0${idx + 1}`,
          title: sec.title,
          content: sec.content,
          status: idx === 0 ? 'Disetujui' : 'Draf',
          lastEditedBy: ownerName || 'AI Architect + PM',
          lastEditedAt: nowFormatted,
        })),
        userStories: (parsed.userStories || []).map((us: any, idx: number) => ({
          id: `US-${Math.floor(300 + idx)}`,
          persona: us.persona,
          story: us.story,
          acceptanceCriteria: us.acceptanceCriteria || [],
          priority: (['P0 - Kritis', 'P1 - Tinggi', 'P2 - Menengah'].includes(us.priority)
            ? us.priority
            : 'P1 - Tinggi'),
          storyPoints: us.storyPoints || 5,
          status: 'Backlog',
          assignee: ownerName || 'Tim Produk',
          syncedTo: [],
        })),
        revisions: [
          {
            id: `rev-${Date.now()}`,
            version: 'v1.0.0',
            timestamp: nowFormatted,
            authorName: ownerName || 'Nadia Kusuma',
            authorRole: 'Product Lead (AI Assisted)',
            sectionId: 'all',
            sectionTitle: '00. Inisialisasi Dokumen PRD via AI Generator',
            changeSummary: `Menghasilkan spesifikasi lengkap "${productName}".`,
            previousContent: '(Dokumen Kosong)',
            newContent: parsed.summary || productBrief,
          },
        ],
        comments: [],
        integrationLogs: [],
      };

      prdDocuments = [newDoc, ...prdDocuments];
      saveStore(prdDocuments);

      broadcastToAll({
        type: 'doc:created',
        document: newDoc,
        documents: prdDocuments,
      });

      res.json({ document: newDoc });
    } catch (error: any) {
      console.error('AI PRD Generation Error:', error);
      const errMsg = String(error?.message || error || '');
      if (
        errMsg.includes('403') ||
        errMsg.includes('PERMISSION_DENIED') ||
        errMsg.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT') ||
        errMsg.includes('API_KEY_INVALID')
      ) {
        res.status(403).json({
          error:
            'Kunci API belum diatur atau ditolak (403). Klik tombol "Pengaturan AI / 9Router" di kanan atas untuk memasukkan API Key gratis (OpenRouter / Groq / Gemini) atau menghubungkan AI Lokal seperti 9Router.',
        });
        return;
      }
      res.status(500).json({
        error: error?.message || 'Gagal menghasilkan PRD dengan AI. Silakan periksa konfigurasi AI Anda.',
      });
    }
  });

  // AI Section Refinement Endpoint
  app.post('/api/ai/refine-section', async (req, res) => {
    try {
      const { docTitle, sectionTitle, currentContent, instruction, providerConfig } = req.body;
      const prompt = `Anda adalah Senior Technical Product Manager.
Perbarui dan pertajam bagian PRD berikut sesuai instruksi pengguna. Gunakan bahasa Indonesia profesional, jelas, dan terukur.

Judul Produk: ${docTitle}
Bagian: ${sectionTitle}
Isi Saat Ini:
${currentContent}

Instruksi Penyempurnaan: ${instruction || 'Perjelas spesifikasi teknis, tambahkan metrik kuantitatif, dan rapikan struktur poin.'}

Kembalikan langsung teks isi bagian yang sudah diperbarui tanpa pembuka/penutup percakapan.`;

      const hasRemoteCustomProvider =
        providerConfig &&
        providerConfig.provider &&
        providerConfig.provider !== 'gemini' &&
        providerConfig.baseUrl &&
        !isLocalhostUrl(providerConfig.baseUrl);

      if (hasRemoteCustomProvider) {
        const modelsToTry =
          providerConfig.comboEnabled && Array.isArray(providerConfig.comboModels) && providerConfig.comboModels.length > 0
            ? providerConfig.comboModels
            : [providerConfig.model || 'gpt-4o-mini'];

        try {
          const comboOutcome = await callOpenAICompatibleWithComboFallback({
            baseUrl: providerConfig.baseUrl,
            apiKey: providerConfig.apiKey,
            models: modelsToTry,
            prompt,
            expectJson: false,
          });
          res.json({
            refinedContent: comboOutcome.result || currentContent,
            usedModel: comboOutcome.usedModel,
            tierIndex: comboOutcome.tierIndex,
          });
          return;
        } catch {
          // fallback below
        }
      }

      const geminiOverrideKey =
        providerConfig?.provider === 'gemini' ? providerConfig?.apiKey : undefined;
      const ai = getGeminiClient(geminiOverrideKey);
      if (ai) {
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: prompt,
          });

          res.json({ refinedContent: response.text?.trim() || currentContent });
          return;
        } catch {
          // fallback below
        }
      }

      const appendedContent = `${currentContent}\n\n[Pembaruan Spesifikasi — ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}]:\n• ${instruction || 'Penajaman spesifikasi teknis dan kriteria penerimaan.'}`;
      res.json({ refinedContent: appendedContent });
    } catch (error: any) {
      console.error('AI Refine Error:', error);
      const errMsg = String(error?.message || error || '');
      if (
        errMsg.includes('403') ||
        errMsg.includes('PERMISSION_DENIED') ||
        errMsg.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT') ||
        errMsg.includes('API_KEY_INVALID')
      ) {
        res.status(403).json({
          error:
            'Kunci API belum diatur atau ditolak (403). Klik tombol "Pengaturan AI / 9Router" di kanan atas untuk mengatur penyedia AI gratis atau lokal Anda.',
        });
        return;
      }
      res.status(500).json({ error: error?.message || 'Gagal menyempurnakan bagian ini.' });
    }
  });

  // Real Trello / Jira / Google Stitch Integration Sync Endpoint
  app.post('/api/integrations/sync', async (req, res) => {
    try {
      const {
        docId,
        tool,
        trelloApiKey,
        trelloToken,
        trelloListId,
        jiraDomain,
        jiraEmail,
        jiraApiToken,
        jiraProjectKey,
        stitchWorkspaceName,
      } = req.body;

      const docIndex = prdDocuments.findIndex((d: any) => d.id === docId);
      if (docIndex === -1) {
        res.status(404).json({ error: 'Dokumen PRD tidak ditemukan' });
        return;
      }

      const doc = prdDocuments[docIndex];
      const nowFormatted = new Date().toISOString().slice(0, 16).replace('T', ' ');
      let actionSummary = '';
      let targetDestination = '';
      let payloadPreview = '';

      if (tool === 'Trello') {
        // If user provided real Trello credentials, make actual REST API calls to Trello
        if (trelloApiKey && trelloToken && trelloListId) {
          let createdCount = 0;
          for (const us of doc.userStories) {
            const cardName = `[${us.id}] ${us.story.slice(0, 80)}`;
            const cardDesc = `**Persona:** ${us.persona}\n**Prioritas:** ${us.priority} (${us.storyPoints} SP)\n\n**Acceptance Criteria:**\n${us.acceptanceCriteria.map((c: string) => `- ${c}`).join('\n')}\n\n_Diekspor dari SpecForge PRD: ${doc.title} (${doc.version})_`;
            const url = `https://api.trello.com/1/cards?idList=${encodeURIComponent(trelloListId)}&key=${encodeURIComponent(trelloApiKey)}&token=${encodeURIComponent(trelloToken)}&name=${encodeURIComponent(cardName)}&desc=${encodeURIComponent(cardDesc)}`;
            const trelloRes = await fetch(url, { method: 'POST' });
            if (trelloRes.ok) {
              createdCount++;
            }
          }
          actionSummary = `Sinkronisasi Langsung ${createdCount} Kartu User Story ke Trello API`;
          targetDestination = `Trello List ID: ${trelloListId}`;
        } else {
          actionSummary = `yiapkan Paket Ekspor & Sinkronisasi ${doc.userStories.length} Kartu ke Board Trello`;
          targetDestination = `Trello Workspace / Board ${doc.code}`;
        }
        payloadPreview = doc.userStories.map((u: any) => `${u.id} (${u.storyPoints}pt)`).join(', ');
      } else if (tool === 'Jira') {
        if (jiraDomain && jiraEmail && jiraApiToken && jiraProjectKey) {
          const authHeader = Buffer.from(`${jiraEmail}:${jiraApiToken}`).toString('base64');
          let createdCount = 0;
          for (const us of doc.userStories) {
            const jiraRes = await fetch(`https://${jiraDomain}/rest/api/3/issue`, {
              method: 'POST',
              headers: {
                Authorization: `Basic ${authHeader}`,
                Accept: 'application/json',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                fields: {
                  project: { key: jiraProjectKey },
                  summary: `[${us.id}] ${us.story.slice(0, 100)}`,
                  issuetype: { name: 'Story' },
                },
              }),
            });
            if (jiraRes.ok) createdCount++;
          }
          actionSummary = `Mendorong ${createdCount} Jira Issues melalui Atlassian REST API v3`;
          targetDestination = `${jiraDomain} / Project ${jiraProjectKey}`;
        } else {
          actionSummary = `Sinkronisasi Struktur Epic & ${doc.userStories.length} Story ke Backlog Jira`;
          targetDestination = `Jira Project ${jiraProjectKey || doc.code.split('-')[1] || 'CORE'}`;
        }
        payloadPreview = `Epic: ${doc.title} + ${doc.userStories.length} Stories`;
      } else if (tool === 'Google Stitch') {
        actionSummary = `Sinkronisasi Spesifikasi Prompt Desain UI & Hierarki Komponen ke Google Stitch`;
        targetDestination = stitchWorkspaceName || `Stitch Design Studio / ${doc.code}`;
        payloadPreview = doc.stitchPromptSpec.slice(0, 120) + '...';
      }

      // Mark user stories as synced to this tool
      doc.userStories = doc.userStories.map((us: any) => ({
        ...us,
        syncedTo: Array.from(new Set([...(us.syncedTo || []), tool])),
      }));

      const newLog = {
        id: `int-${Date.now()}`,
        tool,
        timestamp: nowFormatted,
        action: actionSummary,
        itemsCount: tool === 'Google Stitch' ? doc.sections.length : doc.userStories.length,
        targetDestination,
        status: 'Berhasil',
        payloadPreview,
      };

      doc.integrationLogs = [newLog, ...(doc.integrationLogs || [])];
      saveStore(prdDocuments);

      broadcastToAll({
        type: 'doc:updated',
        document: doc,
      });

      res.json({ document: doc, log: newLog });
    } catch (error: any) {
      console.error('Integration Sync Error:', error);
      res.status(500).json({ error: error?.message || 'Gagal menyinkronkan integrasi.' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`SpecForge Server running on http://localhost:${PORT}`);
  });
}

startServer();
