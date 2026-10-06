import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  FolderArchive,
  Sparkles,
  Share2,
  CheckCircle2,
  Plus,
  Send,
  Copy,
  Check,
  RefreshCw,
  Edit3,
  PanelLeft,
  X,
  FileText,
  History,
  Sun,
  Moon,
  Layers,
  ArrowRight,
  RotateCcw,
  Eye,
  EyeOff,
  Pin,
  Trash2,
  LogOut,
  KeyRound,
  Mail,
  Lock,
  User as UserIcon,
  Wand2,
  Search,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { PRDDocument, ActiveCollaborator } from './types/prd';
import { exportPRDToPDF, exportPRDToZipBundle } from './utils/exportService';
import { OfflineIndicator } from './components/PWAInstallButton';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  author: string;
  text: string;
  timestamp: string;
  prdDocId?: string;
  interviewStep?: number;
  userAnswerText?: string;
  aiSuggestionText?: string;
  aiSuggestionsList?: string[];
  selectedSuggestions?: string[];
  seenSuggestions?: string[];
  isConfirmationCard?: boolean;
  isReadyToGenerateCard?: boolean;
}

interface ChatSession {
  id: string;
  userId: string;
  title: string;
  pinned: boolean;
  updatedAt: string;
  prdDocId?: string;
  messages: ChatMessage[];
  interview?: InterviewFlowState;
}

type ModalView = 'none' | 'ai-settings' | 'integrations' | 'revisions' | 'collaboration' | 'edit-prd';
type AuthScreenMode = 'login' | 'register' | 'forgot-email' | 'forgot-otp' | 'google-instant';

interface NineRouterComboConfig {
  apiKey: string;
  comboName: string;
  baseUrl: string;
  mode?: 'combo' | 'provider';
  providerName?: string;
}

const NINE_ROUTER_PROVIDER_PRESETS = [
  'gemini',
  'claude',
  'openai',
  'deepseek',
  'groq',
  'openrouter',
  'mistral',
  'xai',
  'perplexity',
  'together',
  'cohere',
  'ollama',
];

const PROMPT_EXPORT_TARGETS = [
  {
    id: 'stitch',
    label: 'Google Stitch',
    desc: 'Prompt Desain Antarmuka UI/UX (100% Bahasa Indonesia)',
  },
  {
    id: 'universal',
    label: 'Semua AI (Universal)',
    desc: 'Master Prompt Full-Stack siap tempel ke ChatGPT, Claude, DeepSeek, Grok, Gemini, dll.',
  },
  {
    id: 'cursor',
    label: 'Cursor / Windsurf',
    desc: 'Prompt AI IDE & Ruleset Arsitektur Kode Lengkap',
  },
  {
    id: 'v0',
    label: 'v0 by Vercel',
    desc: 'Prompt Komponen UI Modern React + Tailwind + Lucide Icons',
  },
  {
    id: 'bolt',
    label: 'Bolt.new / Lovable',
    desc: 'Prompt Pembuatan Web App Full-Stack Instan & Database',
  },
  {
    id: 'claude',
    label: 'Claude Artifacts / ChatGPT',
    desc: 'Prompt Aplikasi Interaktif Lengkap dalam Satu Prompt Terstruktur',
  },
  {
    id: 'replit',
    label: 'Replit Agent / Cline',
    desc: 'Prompt Otomasi Agen Coding End-to-End (Frontend + Backend + API)',
  },
];

interface OtherAIProviderConfig {
  activeProvider: string;
  geminiApiKey: string;
  openRouterApiKey: string;
  openRouterModel: string;
  groqApiKey: string;
  groqModel: string;
  customBaseUrl: string;
  customApiKey: string;
  customModel: string;
  providerKeys?: Record<string, { apiKey: string; model: string; baseUrl?: string }>;
}

const UNIVERSAL_AI_PROVIDERS = [
  {
    id: '9router',
    name: '9Router Combo (Default)',
    baseUrl: 'http://localhost:20128/v1',
    defaultModel: 'my-combo',
    keyPlaceholder: 'sk-9router-...',
  },
  {
    id: 'openai',
    name: 'OpenAI (ChatGPT / GPT-4o / o3)',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    keyPlaceholder: 'sk-proj-...',
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude (Claude 3.7 / 3.5 Sonnet)',
    baseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-5-sonnet-latest',
    keyPlaceholder: 'sk-ant-...',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek AI (DeepSeek-V3 / R1)',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    keyPlaceholder: 'sk-...',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter (Semua Model Gratis & Berbayar)',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',
    keyPlaceholder: 'sk-or-v1-...',
  },
  {
    id: 'groq',
    name: 'Groq Cloud (LPU Super Cepat)',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    keyPlaceholder: 'gsk_...',
  },
  {
    id: 'gemini',
    name: 'Google AI (API Key)',
    baseUrl: 'https://generativelanguage.googleapis.com',
    defaultModel: 'gemini-3.8-flash',
    keyPlaceholder: 'AIzaSy...',
  },
  {
    id: 'mistral',
    name: 'Mistral AI (Mistral Large / Codestral)',
    baseUrl: 'https://api.mistral.ai/v1',
    defaultModel: 'mistral-large-latest',
    keyPlaceholder: 'Masukkan Mistral API Key...',
  },
  {
    id: 'xai',
    name: 'xAI Grok (Grok-2 / Grok-3)',
    baseUrl: 'https://api.x.ai/v1',
    defaultModel: 'grok-2-latest',
    keyPlaceholder: 'xai-...',
  },
  {
    id: 'together',
    name: 'Together AI (Llama / Qwen / DeepSeek)',
    baseUrl: 'https://api.together.xyz/v1',
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    keyPlaceholder: 'Masukkan Together API Key...',
  },
  {
    id: 'fireworks',
    name: 'Fireworks AI',
    baseUrl: 'https://api.fireworks.ai/inference/v1',
    defaultModel: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
    keyPlaceholder: 'fw_...',
  },
  {
    id: 'perplexity',
    name: 'Perplexity AI (Sonar Reasoning)',
    baseUrl: 'https://api.perplexity.ai',
    defaultModel: 'sonar-pro',
    keyPlaceholder: 'pplx-...',
  },
  {
    id: 'cerebras',
    name: 'Cerebras Inference',
    baseUrl: 'https://api.cerebras.ai/v1',
    defaultModel: 'llama-3.3-70b',
    keyPlaceholder: 'csk-...',
  },
  {
    id: 'cohere',
    name: 'Cohere AI (Command R+)',
    baseUrl: 'https://api.cohere.ai/compatibility/v1',
    defaultModel: 'command-r-plus-08-2024',
    keyPlaceholder: 'Masukkan Cohere API Key...',
  },
  {
    id: 'ollama',
    name: 'Ollama Lokal (Localhost:11434)',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3.2',
    keyPlaceholder: 'ollama (Opsional / Kosongkan)',
  },
  {
    id: 'lmstudio',
    name: 'LM Studio / Jan AI / vLLM Lokal',
    baseUrl: 'http://localhost:1234/v1',
    defaultModel: 'local-model',
    keyPlaceholder: 'lm-studio (Opsional / Kosongkan)',
  },
  {
    id: 'custom',
    name: 'AI Lainnya / Custom Endpoint Bebas (Universal)',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    keyPlaceholder: 'Masukkan API Key AI Anda...',
  },
];

interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  color: string;
  aiConfig?: {
    activeProvider: string;
    nineRouter: NineRouterComboConfig;
    otherProviders: Omit<OtherAIProviderConfig, 'activeProvider'>;
  };
}

interface InterviewFlowState {
  active: boolean;
  step: number; // 0 = not started, 1..4 = question steps, 5 = ready to generate
  awaitingConfirmation: boolean;
  revisingCurrentStep: boolean;
  productIdea: string;
  targetAudience: string;
  coreFeatures: string;
  uiDesignStyle: string;
  techAndIntegrations: string;
}

const INTERVIEW_QUESTIONS = [
  {
    step: 1,
    title: 'Pertanyaan 1 dari 4 — Target Pengguna & Tujuan Utama',
    question:
      'Untuk siapa web/aplikasi ini dibuat (siapa target penggunanya), dan masalah utama apa yang ingin diselesaikan?',
    placeholder: 'Contoh: Untuk pemilik UMKM dan kasir toko agar bisa mencatat penjualan & stok otomatis...',
  },
  {
    step: 2,
    title: 'Pertanyaan 2 dari 4 — Fitur Utama yang Dibutuhkan',
    question:
      'Apa saja fitur-fitur utama yang wajib ada di dalam web/aplikasi ini, dan bagaimana alur kerjanya?',
    placeholder: 'Contoh: Login multi-peran, dasbor analitik penjualan harian, manajemen produk, ekspor laporan PDF...',
  },
  {
    step: 3,
    title: 'Pertanyaan 3 dari 4 — Desain Tampilan & Bahasa UI (Untuk Google Stitch)',
    question:
      'Seperti apa gaya tampilan (UI/UX), warna dominan, dan tata letak layar yang Anda inginkan untuk desain Google Stitch berbahasa Indonesia?',
    placeholder: 'Contoh: Tampilan bersih modern warna biru-putih, menu navigasi di kiri, tabel ringkas, 100% Bahasa Indonesia...',
  },
  {
    step: 4,
    title: 'Pertanyaan 4 dari 4 — Teknologi, Keamanan & Target Rilis',
    question:
      'Apakah ada kebutuhan khusus untuk teknologi (stack), integrasi sistem (pembayaran/API), atau target metrik keberhasilan?',
    placeholder: 'Contoh: Web responsif cepat (React + Node.js), integrasi QRIS/WhatsApp, waktu muat di bawah 2 detik...',
  },
];

// Full pool of 35 distinct smart AI recommendations per interview step so refreshing unchecked items never repeats previous suggestions
function getContextualAISuggestionsPool(
  step: number,
  productIdea: string,
  userAnswer: string
): string[] {
  const ideaShort = productIdea.slice(0, 50) || 'aplikasi ini';
  const ansShort = userAnswer.slice(0, 40) || 'kebutuhan utama';

  if (step === 1) {
    return [
      `Pembagian peran multi-pengguna (Super Admin, Manajer Operasional, Staf, & Pelanggan/Pengguna Akhir) untuk "${ideaShort}"`,
      `Target efisiensi waktu kerja operasional hingga 60% lebih cepat dibanding proses manual`,
      `Akses lintas perangkat yang responsif (HP Android, iPhone, Tablet, dan Laptop/PC)`,
      `Alur pendaftaran & onboarding pengguna baru yang instan kurang dari 60 detik`,
      `Dukungan aksesibilitas ramah pengguna awam dengan panduan interaktif berbahasa Indonesia`,
      `Segmentasi hak akses data berdasarkan cabang, divisi, atau wilayah operasional`,
      `Penyelesaian masalah keterlambatan laporan dengan pemantauan status secara real-time`,
      `Pengurangan risiko human-error melalui validasi input otomatis di setiap formulir`,
      `Peningkatan retensi & kepuasan pengguna melalui pengalaman kerja yang bersih tanpa iklan`,
      `Dukungan kolaborasi tim secara bersamaan (multi-user real-time) tanpa bentrok data`,
      `Portal mandiri (Self-Service Portal) bagi pelanggan untuk melacak pesanan atau status layanan secara langsung`,
      `Sistem pengingat otomatis untuk tugas yang belum diselesaikan oleh anggota tim operasional`,
      `Dukungan multi-bahasa daerah/Indonesia formal yang mudah dipahami berbagai kalangan usia`,
      `Fitur mode tamu (Guest Preview) agar calon pengguna bisa mencoba alur dasar sebelum mendaftar`,
      `Pemetaan profil pengguna otomatis untuk menyesuaikan tampilan menu sesuai jabatan/peran`,
      `Target penghematan biaya operasional bulanan hingga 45% melalui digitalisasi dokumen kertas`,
      `Sistem antrean dan penjadwalan terpadu untuk mencegah penumpukan permintaan di jam sibuk`,
      `Rekapitulasi kinerja harian per staf untuk memudahkan evaluasi oleh pemilik bisnis / manajer`,
      `Dukungan bagi pengguna dengan koneksi internet terbatas di daerah luar kota (hemat kuota data)`,
      `Penanganan keluhan & tiket bantuan pelanggan terpusat dengan target respons di bawah 15 menit`,
      `Integrasi buku alamat & riwayat interaksi pelanggan (CRM Ringkas) untuk layanan yang lebih personal`,
      `Opsi delegasi tugas sementara saat anggota tim sedang cuti atau berhalangan hadir`,
      `Verifikasi identitas pengguna bertingkat untuk menjaga kerahasiaan data transaksi sensitif`,
      `Dasbor khusus eksekutif/pemilik usaha untuk memantau arus kas dan pertumbuhan pengguna harian`,
      `Kemampuan berbagi tautan laporan publik secara aman dengan masa berlaku yang bisa diatur`,
      `Standarisasi SOP kerja digital agar seluruh karyawan baru langsung mengikuti alur yang seragam`,
      `Pencatatan kepuasan pelanggan (CSAT & Rating Bintang) otomatis setelah transaksi selesai`,
      `Pengelompokan segmen pelanggan VIP, Reguler, dan Baru untuk prioritas pelayanan`,
      `Sinkronisasi jadwal kerja tim dengan kalender operasional agar tidak terjadi jadwal ganda`,
      `Fokus penyelesaian masalah duplikasi data pelanggan dengan deteksi nomor HP/email kembar otomatis`,
    ];
  }

  if (step === 2) {
    return [
      `Dasbor Analitik & Ringkasan KPI Real-Time yang relevan dengan "${ansShort}"`,
      `Pencarian Cepat (Instant Search), Filter Multi-Kategori, & Pengurutan Data Otomatis`,
      `Sistem Autentikasi Lengkap (Login Email, Lupa Sandi Kode OTP 6 Digit, & Login Google)`,
      `Notifikasi Otomatis Real-Time (In-App Toast, Email, & Integrasi Pengingat WhatsApp)`,
      `Fitur Ekspor & Unduh Laporan Satu Klik ke format PDF, Excel/CSV, dan Bundel ZIP`,
      `Manajemen Data CRUD Lengkap dengan Riwayat Perubahan (Audit Log & Pelacakan Revisi)`,
      `Sistem Persetujuan Bertingkat (Approval Workflow: Draf, Ditinjau, Disetujui)`,
      `Fitur Impor Data Massal (Bulk Upload CSV/Excel) beserta validasi otomatis`,
      `Manajemen Profil Pengguna, Pengaturan Preferensi Akun, & Penyimpanan Riwayat Aktivitas`,
      `Integrasi Buku Panduan / Bantuan Cepat & Umpan Balik Pengguna di dalam aplikasi`,
      `Pembuatan Faktur / Bukti Transaksi Otomatis lengkap dengan QR Code verifikasi keaslian`,
      `Fitur Keranjang / Pemesanan Cepat dengan perhitungan diskon, pajak PPN, dan ongkos kirim otomatis`,
      `Kalender Interaktif & Jadwal Kegiatan untuk memantau tenggat waktu proyek atau pesanan`,
      `Fitur Komentar & Diskusi Langsung di dalam setiap item dokumen untuk koordinasi tim`,
      `Peringatan Stok / Kuota Menipis secara otomatis sebelum kehabisan persediaan`,
      `Fitur Duplikasi / Template Cepat agar pengguna tidak perlu mengetik ulang data yang berulang`,
      `Riwayat Versi (Version Control) dengan tombol Pulihkan Versi Sebelumnya (Rollback 1-Klik)`,
      `Fitur Sematkan (Pin) Item Penting agar selalu tampil di urutan paling atas daftar kerja`,
      `Kalkulator Simulasi Biaya / Estimasi Harga Otomatis berdasarkan parameter yang dipilih pengguna`,
      `Galeri Lampiran Berkas (Upload Foto, Dokumen PDF, & Pratinjau Gambar Langsung di Web)`,
      `Sistem Tag & Label Warna-Warni untuk mengelompokkan kategori proyek atau prioritas tugas`,
      `Fitur Arsip Otomatis untuk menyembunyikan data lama tanpa menghapusnya dari database`,
      `Cetak Struk / Dokumen Langsung (Print-Friendly View) untuk printer kasir maupun kertas A4`,
      ` Grafik Perbandingan Bulanan & Tahunan (Bar, Line, & Donut Chart) yang interaktif`,
      `Daftar Periksa (Checklist Tugas) dengan indikator bilah persentase penyelesaian (Progress Bar)`,
      `Fitur Bagikan ke WhatsApp / Telegram dalam sekali klik dengan format pesan yang sudah rapi`,
      `Pencarian Riwayat Percakapan & Dokumen berdasarkan kata kunci maupun rentang tanggal`,
      `Mode Fokus / Layar Penuh untuk menyusun dokumen panjang tanpa gangguan menu samping`,
      `Pengaturan Hak Akses Per Dokumen (Bisa dilihat semua orang, hanya tim, atau privat)`,
      `Ringkasan Eksekutif Otomatis di bagian atas halaman untuk pembacaan cepat dalam 30 detik`,
    ];
  }

  if (step === 3) {
    return [
      `Seluruh teks UI, menu navigasi, tombol, label formulir, dan tabel wajib 100% Bahasa Indonesia di Google Stitch`,
      `Dukungan penuh Mode Terang (Light Mode) & Mode Gelap (Dark Mode) yang nyaman di mata`,
      `Tata letak Dasbor Modern: Navigasi Samping (Collapsible Sidebar) + Header Ringkas + Area Kerja Utama`,
      `Bagian atas menampilkan 4 Kartu Metrik KPI Utama dengan indikator persentase pertumbuhan warna hijau/merah`,
      `Tabel Data Interaktif dengan status lencana (Badge Status), tombol aksi cepat, dan paginasi bersih`,
      `Tipografi modern yang tajam dan mudah dibaca (Plus Jakarta Sans / Inter) dengan hierarki visual jelas`,
      `Formulir input modal/drawer yang rapi dengan validasi langsung dan ikon mata pada kolom kata sandi`,
      `Tampilan Mobile-First yang responsif dengan navigasi geser (Slide-Over Drawer) saat dibuka di layar HP`,
      `Palet warna profesional berkonsep Clean Enterprise (Biru Royal #0B57D0, Putih Bersih, & Abu-abu Slate)`,
      `Komponen Empty State (Layar Kosong) & Loading Skeleton yang elegan dan informatif`,
      `Sudut kartu membulat modern (Rounded-2xl / 3xl) dengan bayangan halus (Soft Elevation Shadow)`,
      `Header Atas lengket (Sticky Topbar) yang menampilkan status koneksi, profil, dan tombol aksi utama`,
      `Kontras warna tinggi berstandar WCAG AA agar teks tetap jelas dibaca di luar ruangan / layar HP`,
      `Tombol Aksi Utama (Primary CTA) berukuran ramah jempol (minimal tinggi 44px) untuk pengguna layar sentuh`,
      `Indikator Langkah Bertahap (Stepper Progress) yang jelas saat pengguna mengisi alur bertahap`,
      `Tampilan Kartu Ringkas (Card Grid View) otomatis saat dibuka di layar sempit menggantikan tabel lebar`,
      `Animasi transisi halus (Micro-interactions 150ms) saat membuka menu, modal, dan berpindah tab`,
      `Penggunaan ikon vektor konsisten (Lucide Icons) di setiap menu navigasi dan tombol aksi`,
      `Notifikasi Toast melayang di bagian atas/bawah yang tidak menutupi tombol kirim utama`,
      `Tata letak Split-View pada layar laptop untuk melihat daftar di kiri dan detail konten di kanan`,
      `Kotak Pencarian (Omnibox Search) bergaya modern dengan tombol bersihkan teks (X) instan`,
      `Lencana Status Berwarna Semantik (Hijau = Disetujui/Selesai, Biru = Ditinjau, Kuning = Draf, Merah = Penting)`,
      `Area Input Chat / Prompt di bagian bawah yang otomatis menyesuaikan tinggi baris teks (Auto-Resize Textarea)`,
      `Desain halaman Login & Register satu kolom terpusat yang bersih dengan tombol Masuk Google resmi`,
      `Visualisasi perbandingan revisi (Diff View Sebelum vs Sesudah) dengan sorotan warna merah dan hijau lembut`,
      `Tampilan ramah cetak (Print/PDF Layout) dengan kop dokumen profesional dan nomor halaman rapi`,
      `Pengelompokan tab pengaturan yang bersih tanpa menumpuk terlalu banyak kolom dalam satu layar`,
      `Spasi antar elemen (Whitespace) yang lega agar tampilan tidak terasa penuh atau membingungkan`,
      `Penanda aktif (Active Indicator) yang jelas pada menu riwayat chat yang sedang dibuka`,
      `Dukungan tampilan mandiri penuh (Standalone PWA Display) tanpa bilah alamat browser saat diunduh`,
    ];
  }

  return [
    `Arsitektur Progressive Web App (PWA) agar aplikasi bisa diunduh & dipasang di HP maupun Laptop`,
    `Target kecepatan muat halaman awal (First Contentful Paint) di bawah 1.5 detik`,
    `Keamanan tingkat tinggi: Enkripsi kata sandi, proteksi token sesi, CORS, & Role-Based Access Control (RBAC)`,
    `Sinkronisasi data real-time antar pengguna menggunakan WebSocket & REST API terstruktur`,
    `Integrasi fleksibel dengan berbagai AI (9Router Combo, OpenAI, Claude, DeepSeek, Groq, OpenRouter, Ollama)`,
    `Dukungan penyimpanan lokal (Offline Caching) agar aplikasi tetap bisa dibuka saat sinyal lemah`,
    `Skema database terstruktur dengan pencadangan otomatis (Auto-Backup) & riwayat versi dokumen`,
    `Integrasi pembayaran digital (QRIS / Virtual Account) & pengiriman email otomatis (SMTP / OTP)`,
    `Target ketersediaan layanan (Uptime SLA) 99.9% dengan penanganan error (Smart Fallback) otomatis`,
    `Kemudahan deployment cloud & kontainerisasi dengan dokumentasi API yang lengkap`,
    `Validasi skema input di sisi klien dan server untuk mencegah serangan SQL Injection & XSS`,
    `Arsitektur modular berbasis komponen (React + TypeScript) yang mudah dikembangkan jangka panjang`,
    `Pembatasan laju permintaan (Rate Limiting) pada endpoint autentikasi dan pengiriman kode OTP`,
    `Penyimpanan kunci API pengguna secara terisolasi per akun agar tidak bercampur dengan pengguna lain`,
    `Dukungan ekspor bundel proyek lengkap (.ZIP) yang berisi Markdown, JSON Schema, HTML, dan Backlog CSV`,
    `Integrasi sinkronisasi dua arah dengan alat manajemen proyek populer (Google Stitch, Trello, & Jira)`,
    `Kompresi aset otomatis (Gzip/Brotli) dan pemuatan gambar malas (Lazy Loading) untuk menghemat bandwidth`,
    `Pencatatan log audit keamanan untuk setiap aktivitas login, perubahan sandi, dan penghapusan data`,
    `Mekanisme penyambungan ulang otomatis (Auto-Reconnect WebSocket) saat koneksi internet sempat terputus`,
    `Dukungan pembacaan format respons JSON yang tahan terhadap teks tambahan dari berbagai model AI`,
    `Kompatibilitas penuh pada seluruh browser modern (Chrome, Safari iOS, Edge, Firefox, & Brave)`,
    `Pemisahan konfigurasi rahasia menggunakan variabel lingkungan (.env) sesuai standar keamanan produksi`,
    `Kemampuan menangani ratusan dokumen dan riwayat percakapan panjang tanpa penurunan performa UI`,
    `Sistem pembaruan Service Worker otomatis (Auto-Update PWA) ketika versi fitur baru dirilis`,
    `Dukungan webhook keluar untuk menghubungkan kejadian aplikasi ke Slack, Discord, atau sistem ERP internal`,
  ];
}

function buildContextualAISuggestionsList(
  step: number,
  productIdea: string,
  userAnswer: string
): string[] {
  return getContextualAISuggestionsPool(step, productIdea, userAnswer).slice(0, 10);
}

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const savedTheme = localStorage.getItem('nexus_prd_theme');
      if (savedTheme === 'dark') return true;
      if (savedTheme === 'light') return false;
    } catch {
      // ignore
    }
    return false;
  });

  useEffect(() => {
    try {
      localStorage.setItem('nexus_prd_theme', darkMode ? 'dark' : 'light');
    } catch {
      // ignore
    }
  }, [darkMode]);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );
  const [chatSearchQuery, setChatSearchQuery] = useState<string>('');
  const [documents, setDocuments] = useState<PRDDocument[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('');

  // AUTHENTICATION STATE (Login, Register, Forgot Password 6-Digit Email OTP, Google Login)
  const [authUser, setAuthUser] = useState<AuthenticatedUser | null>(() => {
    try {
      const saved = localStorage.getItem('specforge_auth_user');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return null;
  });

  const [authMode, setAuthMode] = useState<AuthScreenMode>('login');
  const [authName, setAuthName] = useState<string>('');
  const [authEmail, setAuthEmail] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [authNewPassword, setAuthNewPassword] = useState<string>('');
  const [authOtpCode, setAuthOtpCode] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authInfo, setAuthInfo] = useState<string | null>(null);
  const [demoOtpHint, setDemoOtpHint] = useState<string | null>(null);

  // Per-User 9Router Config (Supports Combo Mode -> Nama Combo OR Single Provider Mode -> Nama Provider)
  const [comboConfig, setComboConfig] = useState<NineRouterComboConfig>({
    apiKey: '',
    comboName: 'my-combo',
    baseUrl: 'http://localhost:20128/v1',
    mode: 'combo',
    providerName: 'gemini',
  });

  // Additional AI Providers per user (Gemini, OpenRouter, Groq, Custom)
  const [otherAiConfig, setOtherAiConfig] = useState<OtherAIProviderConfig>({
    activeProvider: '9router',
    geminiApiKey: '',
    openRouterApiKey: '',
    openRouterModel: 'meta-llama/llama-3.3-70b-instruct:free',
    groqApiKey: '',
    groqModel: 'llama-3.3-70b-versatile',
    customBaseUrl: 'https://api.openai.com/v1',
    customApiKey: '',
    customModel: 'gpt-4o-mini',
  });

  const [aiSettingsTab, setAiSettingsTab] = useState<'9router' | 'other'>('9router');
  const [showAdvancedEndpoint, setShowAdvancedEndpoint] = useState<boolean>(false);
  const [detectedCombos, setDetectedCombos] = useState<string[]>([]);
  const [isFetchingCombos, setIsFetchingCombos] = useState<boolean>(false);
  const [showApiKeyEye, setShowApiKeyEye] = useState<boolean>(false);

  // Persistent Chat History State (Never Lost, Pin, Edit Title, Delete)
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>('');
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingChatTitle, setEditingChatTitle] = useState<string>('');

  // Step-by-Step Interactive Discovery Interview State
  const [interview, setInterview] = useState<InterviewFlowState>({
    active: false,
    step: 0,
    awaitingConfirmation: false,
    revisingCurrentStep: false,
    productIdea: '',
    targetAudience: '',
    coreFeatures: '',
    uiDesignStyle: '',
    techAndIntegrations: '',
  });

  // Chat Messages State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [expandedUserMsgIds, setExpandedUserMsgIds] = useState<Record<string, boolean>>({});
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [promptInput, setPromptInput] = useState<string>('');
  const [chatMode, setChatMode] = useState<'new' | 'refine'>('new');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Real-time WebSocket Collaborators
  const [collaborators, setCollaborators] = useState<ActiveCollaborator[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const clientIdRef = useRef<string>(`client-${Math.random().toString(36).substring(2, 8)}`);

  // On-Demand Modal State
  const [activeModal, setActiveModal] = useState<ModalView>('none');
  const [activeIntegrationTool, setActiveIntegrationTool] = useState<'Google Stitch' | 'Prompt AI Lainnya' | 'Trello' | 'Jira'>('Google Stitch');
  const [promptExportTarget, setPromptExportTarget] = useState<string>('universal');
  const [customAiPromptOverrides, setCustomAiPromptOverrides] = useState<Record<string, string>>({});
  const [stitchWorkspaceName] = useState<string>('Stitch Design Studio / Core-v2');
  const [trelloApiKey, setTrelloApiKey] = useState<string>('');
  const [trelloToken, setTrelloToken] = useState<string>('');
  const [trelloListId, setTrelloListId] = useState<string>('');
  const [jiraDomain, setJiraDomain] = useState<string>('');
  const [jiraEmail, setJiraEmail] = useState<string>('');
  const [jiraApiToken, setJiraApiToken] = useState<string>('');
  const [jiraProjectKey, setJiraProjectKey] = useState<string>('FIN');
  const [isSyncingIntegration, setIsSyncingIntegration] = useState<boolean>(false);
  const [copiedStitchPrompt, setCopiedStitchPrompt] = useState<boolean>(false);

  // Manual Section Edit inside Modal
  const [editingSectionId, setEditingSectionId] = useState<string>('sec-1');
  const [draftTitle, setDraftTitle] = useState<string>('');
  const [draftContent, setDraftContent] = useState<string>('');
  const [draftStatus, setDraftStatus] = useState<'Draf' | 'Ditinjau' | 'Disetujui'>('Draf');
  const [changeNote, setChangeNote] = useState<string>('');
  const [selectedRevisionId, setSelectedRevisionId] = useState<string>('');

  // Toast Feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Load user-specific AI keys & persistent chat sessions when user logs in
  useEffect(() => {
    if (!authUser) return;
    try {
      localStorage.setItem('specforge_auth_user', JSON.stringify(authUser));
      const localKey = `specforge_ai_config_${authUser.id}`;
      const savedLocal = localStorage.getItem(localKey);
      if (savedLocal) {
        const parsed = JSON.parse(savedLocal);
        if (parsed.nineRouter) setComboConfig(parsed.nineRouter);
        if (parsed.otherProviders) {
          setOtherAiConfig({
            activeProvider: parsed.activeProvider || '9router',
            ...parsed.otherProviders,
          });
        }
      } else if (authUser.aiConfig) {
        if (authUser.aiConfig.nineRouter) setComboConfig(authUser.aiConfig.nineRouter);
        if (authUser.aiConfig.otherProviders) {
          setOtherAiConfig({
            activeProvider: authUser.aiConfig.activeProvider || '9router',
            ...authUser.aiConfig.otherProviders,
          });
        }
      }
    } catch {
      // ignore
    }

    // Fetch persistent chats for this user from server + localStorage backup
    // Always open directly into a fresh "Chat PRD Baru" while keeping saved chats in the sidebar
    fetch(`/api/chats?userId=${encodeURIComponent(authUser.id)}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.chats) && data.chats.length > 0) {
          setChatSessions(data.chats);
        } else {
          const backup = localStorage.getItem(`specforge_chats_${authUser.id}`);
          if (backup) {
            const parsedChats: ChatSession[] = JSON.parse(backup);
            setChatSessions(parsedChats);
          } else {
            setChatSessions([]);
          }
        }
        setActiveChatId(`chat-${Date.now()}`);
        setMessages([]);
        setChatMode('new');
        setInterview({
          active: false,
          step: 0,
          awaitingConfirmation: false,
          revisingCurrentStep: false,
          productIdea: '',
          targetAudience: '',
          coreFeatures: '',
          uiDesignStyle: '',
          techAndIntegrations: '',
        });
      })
      .catch(() => {
        const backup = localStorage.getItem(`specforge_chats_${authUser.id}`);
        if (backup) {
          setChatSessions(JSON.parse(backup));
        }
        setActiveChatId(`chat-${Date.now()}`);
        setMessages([]);
        setChatMode('new');
      });
  }, [authUser?.id]);

  // Listen for Google OAuth popup callback message
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.user) {
        setAuthUser(event.data.user);
        triggerToast(`Selamat datang, ${event.data.user.name}!`);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Automatically persist current chat session whenever messages or interview state change
  useEffect(() => {
    if (!authUser || messages.length === 0) return;

    const sessionId = activeChatId || `chat-${Date.now()}`;
    if (!activeChatId) {
      setActiveChatId(sessionId);
    }

    const existing = chatSessions.find((c) => c.id === sessionId);
    const firstUserMsg = messages.find((m) => m.role === 'user')?.text || 'Percakapan PRD Baru';
    const sessionTitle = existing?.title || firstUserMsg.slice(0, 48);
    const attachedPrdId =
      [...messages].reverse().find((m) => m.prdDocId)?.prdDocId || existing?.prdDocId;

    const updatedSession: ChatSession = {
      id: sessionId,
      userId: authUser.id,
      title: sessionTitle,
      pinned: existing?.pinned || false,
      updatedAt: new Date().toISOString(),
      prdDocId: attachedPrdId,
      messages,
      interview,
    };

    setChatSessions((prev) => {
      const filtered = prev.filter((c) => c.id !== sessionId);
      const nextList = [updatedSession, ...filtered].sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
      try {
        localStorage.setItem(`specforge_chats_${authUser.id}`, JSON.stringify(nextList));
      } catch {
        // ignore
      }
      return nextList;
    });

    fetch('/api/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedSession),
    }).catch(() => {});
  }, [messages, interview]);

  // Load initial PRDs & connect WebSocket
  useEffect(() => {
    fetch('/api/prds')
      .then((r) => r.json())
      .then((data) => {
        if (data.documents && data.documents.length > 0) {
          setDocuments(data.documents);
          setSelectedDocId(data.documents[0].id);
          if (data.documents[0].revisions?.[0]) {
            setSelectedRevisionId(data.documents[0].revisions[0].id);
          }
        }
      })
      .catch((err) => console.error('Initial PRD load error:', err));

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: 'presence:join',
          clientId: clientIdRef.current,
          name: authUser?.name || 'Nadia Kusuma',
          role: authUser?.role || 'Product Manager',
          color: authUser?.color || '#1A73E8',
          activeDocId: 'prd-2026-01',
          activeSectionId: 'sec-1',
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'state:init') {
          if (msg.documents) {
            setDocuments(msg.documents);
            setSelectedDocId((prev) => prev || msg.documents[0]?.id || '');
          }
          if (msg.collaborators) {
            setCollaborators(msg.collaborators);
          }
        } else if (msg.type === 'presence:update') {
          setCollaborators(msg.collaborators || []);
        } else if (msg.type === 'doc:updated' && msg.document) {
          setDocuments((prev) =>
            prev.map((d) => (d.id === msg.document.id ? msg.document : d))
          );
          if (msg.latestRevision) {
            setSelectedRevisionId(msg.latestRevision.id);
          }
        } else if (msg.type === 'doc:created' && msg.document) {
          if (msg.documents) {
            setDocuments(msg.documents);
          } else {
            setDocuments((prev) => {
              if (prev.some((d) => d.id === msg.document.id)) return prev;
              return [msg.document, ...prev];
            });
          }
        }
      } catch (e) {
        console.error('WS parse error:', e);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  const currentDoc = documents.find((d) => d.id === selectedDocId) || documents[0];

  // Automatically detect AI provider, endpoint, and default model from any pasted API key (Paid or Free)
  const detectProviderFromApiKey = (rawKey: string) => {
    const k = rawKey.trim();
    if (k.startsWith('sk-ant-')) {
      return {
        id: 'anthropic',
        name: 'Anthropic Claude',
        baseUrl: 'https://api.anthropic.com/v1',
        defaultModel: 'claude-3-5-sonnet-latest',
      };
    }
    if (k.startsWith('sk-or-')) {
      return {
        id: 'openrouter',
        name: 'OpenRouter AI',
        baseUrl: 'https://openrouter.ai/api/v1',
        defaultModel: 'openai/gpt-4o-mini',
      };
    }
    if (k.startsWith('gsk_')) {
      return {
        id: 'groq',
        name: 'Groq Cloud',
        baseUrl: 'https://api.groq.com/openai/v1',
        defaultModel: 'llama-3.3-70b-versatile',
      };
    }
    if (k.startsWith('AIza')) {
      return {
        id: 'gemini',
        name: 'Google AI',
        baseUrl: 'https://generativelanguage.googleapis.com',
        defaultModel: 'gemini-3.8-flash',
      };
    }
    if (k.startsWith('xai-')) {
      return {
        id: 'xai',
        name: 'xAI Grok',
        baseUrl: 'https://api.x.ai/v1',
        defaultModel: 'grok-2-latest',
      };
    }
    if (k.startsWith('pplx-')) {
      return {
        id: 'perplexity',
        name: 'Perplexity AI',
        baseUrl: 'https://api.perplexity.ai',
        defaultModel: 'sonar-pro',
      };
    }
    if (k.startsWith('fw_')) {
      return {
        id: 'fireworks',
        name: 'Fireworks AI',
        baseUrl: 'https://api.fireworks.ai/inference/v1',
        defaultModel: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
      };
    }
    if (k.startsWith('csk-')) {
      return {
        id: 'cerebras',
        name: 'Cerebras AI',
        baseUrl: 'https://api.cerebras.ai/v1',
        defaultModel: 'llama-3.3-70b',
      };
    }
    if (k.startsWith('sk-proj-') || k.startsWith('sk-svcacct-')) {
      return {
        id: 'openai',
        name: 'OpenAI (ChatGPT)',
        baseUrl: 'https://api.openai.com/v1',
        defaultModel: 'gpt-4o-mini',
      };
    }
    return null;
  };

  // Helper to get/set current provider credentials from UNIVERSAL_AI_PROVIDERS
  const getCurrentProviderEntry = (providerId: string) => {
    const preset =
      UNIVERSAL_AI_PROVIDERS.find((p) => p.id === providerId) ||
      UNIVERSAL_AI_PROVIDERS[UNIVERSAL_AI_PROVIDERS.length - 1];
    const saved = otherAiConfig.providerKeys?.[providerId];

    if (providerId === 'gemini') {
      return {
        apiKey: saved?.apiKey ?? otherAiConfig.geminiApiKey ?? '',
        model: saved?.model || preset.defaultModel,
        baseUrl: preset.baseUrl,
      };
    }
    if (providerId === 'openrouter') {
      return {
        apiKey: saved?.apiKey ?? otherAiConfig.openRouterApiKey ?? '',
        model: saved?.model || otherAiConfig.openRouterModel || preset.defaultModel,
        baseUrl: preset.baseUrl,
      };
    }
    if (providerId === 'groq') {
      return {
        apiKey: saved?.apiKey ?? otherAiConfig.groqApiKey ?? '',
        model: saved?.model || otherAiConfig.groqModel || preset.defaultModel,
        baseUrl: preset.baseUrl,
      };
    }
    if (providerId === 'custom') {
      return {
        apiKey: saved?.apiKey ?? otherAiConfig.customApiKey ?? '',
        model: saved?.model || otherAiConfig.customModel || preset.defaultModel,
        baseUrl: saved?.baseUrl || otherAiConfig.customBaseUrl || preset.baseUrl,
      };
    }
    return {
      apiKey: saved?.apiKey || '',
      model: saved?.model || preset.defaultModel,
      baseUrl: saved?.baseUrl || preset.baseUrl,
    };
  };

  const updateCurrentProviderEntry = (
    providerId: string,
    patch: Partial<{ apiKey: string; model: string; baseUrl: string }>
  ) => {
    const current = getCurrentProviderEntry(providerId);
    const updatedEntry = { ...current, ...patch };
    setOtherAiConfig((prev) => {
      const nextKeys = { ...(prev.providerKeys || {}), [providerId]: updatedEntry };
      const nextState: OtherAIProviderConfig = {
        ...prev,
        providerKeys: nextKeys,
      };
      if (providerId === 'gemini' && patch.apiKey !== undefined) {
        nextState.geminiApiKey = patch.apiKey;
      }
      if (providerId === 'openrouter') {
        if (patch.apiKey !== undefined) nextState.openRouterApiKey = patch.apiKey;
        if (patch.model !== undefined) nextState.openRouterModel = patch.model;
      }
      if (providerId === 'groq') {
        if (patch.apiKey !== undefined) nextState.groqApiKey = patch.apiKey;
        if (patch.model !== undefined) nextState.groqModel = patch.model;
      }
      if (providerId === 'custom') {
        if (patch.apiKey !== undefined) nextState.customApiKey = patch.apiKey;
        if (patch.model !== undefined) nextState.customModel = patch.model;
        if (patch.baseUrl !== undefined) nextState.customBaseUrl = patch.baseUrl;
      }
      return nextState;
    });
  };

  // Save Per-User AI Settings (both 9Router Combo and Universal AI Providers)
  const handleSaveUserAiSettings = async () => {
    if (!authUser) return;
    const payload = {
      activeProvider: otherAiConfig.activeProvider,
      nineRouter: comboConfig,
      otherProviders: {
        geminiApiKey: otherAiConfig.geminiApiKey,
        openRouterApiKey: otherAiConfig.openRouterApiKey,
        openRouterModel: otherAiConfig.openRouterModel,
        groqApiKey: otherAiConfig.groqApiKey,
        groqModel: otherAiConfig.groqModel,
        customBaseUrl: otherAiConfig.customBaseUrl,
        customApiKey: otherAiConfig.customApiKey,
        customModel: otherAiConfig.customModel,
        providerKeys: otherAiConfig.providerKeys || {},
      },
    };
    try {
      localStorage.setItem(`specforge_ai_config_${authUser.id}`, JSON.stringify(payload));
      await fetch(`/api/users/${encodeURIComponent(authUser.id)}/ai-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiConfig: payload }),
      });
    } catch {
      // ignore
    }
    setActiveModal('none');
    const isProviderMode = comboConfig.mode === 'provider';
    triggerToast(
      otherAiConfig.activeProvider === '9router'
        ? isProviderMode
          ? `Tersambung ke Provider: "${comboConfig.providerName || 'gemini'}"`
          : `Tersambung ke 9Router Combo: "${comboConfig.comboName || 'default'}"`
        : `Penyedia AI aktif: ${activeProviderBadgeLabel()}`
    );
  };

  // Pin / Unpin Chat Session
  const handleTogglePinChat = async (chat: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextPinned = !chat.pinned;
    setChatSessions((prev) => {
      const updated = prev
        .map((c) => (c.id === chat.id ? { ...c, pinned: nextPinned } : c))
        .sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
      if (authUser) {
        localStorage.setItem(`specforge_chats_${authUser.id}`, JSON.stringify(updated));
      }
      return updated;
    });
    await fetch(`/api/chats/${encodeURIComponent(chat.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned: nextPinned }),
    }).catch(() => {});
    triggerToast(nextPinned ? 'Percakapan disematkan di atas.' : 'Sematan percakapan dilepas.');
  };

  // Rename Chat Session Title
  const handleSaveChatRename = async (chatId: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = editingChatTitle.trim();
    if (!clean) {
      setEditingChatId(null);
      return;
    }
    setChatSessions((prev) => {
      const updated = prev.map((c) => (c.id === chatId ? { ...c, title: clean } : c));
      if (authUser) {
        localStorage.setItem(`specforge_chats_${authUser.id}`, JSON.stringify(updated));
      }
      return updated;
    });
    setEditingChatId(null);
    await fetch(`/api/chats/${encodeURIComponent(chatId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: clean }),
    }).catch(() => {});
    triggerToast('Judul riwayat chat diperbarui.');
  };

  // Delete Chat Session
  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setChatSessions((prev) => {
      const remaining = prev.filter((c) => c.id !== chatId);
      if (authUser) {
        localStorage.setItem(`specforge_chats_${authUser.id}`, JSON.stringify(remaining));
      }
      return remaining;
    });
    if (activeChatId === chatId) {
      handleStartNewChat();
    }
    await fetch(`/api/chats/${encodeURIComponent(chatId)}`, {
      method: 'DELETE',
    }).catch(() => {});
    triggerToast('Riwayat chat dihapus.');
  };

  // Select Saved Chat Session from Sidebar
  const handleSelectChatSession = (chat: ChatSession) => {
    setActiveChatId(chat.id);
    setMessages(chat.messages || []);
    if (chat.interview) {
      setInterview(chat.interview);
    } else {
      setInterview({
        active: false,
        step: 0,
        awaitingConfirmation: false,
        revisingCurrentStep: false,
        productIdea: '',
        targetAudience: '',
        coreFeatures: '',
        uiDesignStyle: '',
        techAndIntegrations: '',
      });
    }
    if (chat.prdDocId) {
      setSelectedDocId(chat.prdDocId);
      setChatMode('refine');
    }
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  // Authentication Handlers
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthInfo(null);
    setAuthLoading(true);

    try {
      if (authMode === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authEmail, password: authPassword }),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Gagal masuk.');
        setAuthUser(data.user);
        triggerToast(`Selamat datang kembali, ${data.user.name}!`);
      } else if (authMode === 'register') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: authName, email: authEmail, password: authPassword }),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Gagal mendaftar.');
        setAuthUser(data.user);
        triggerToast(`Akun ${data.user.name} berhasil dibuat!`);
      } else if (authMode === 'forgot-email') {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authEmail }),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Gagal mengirim kode.');
        setAuthInfo(data.message);
        if (data.demoOtpCode) {
          setDemoOtpHint(data.demoOtpCode);
        }
        setAuthMode('forgot-otp');
      } else if (authMode === 'forgot-otp') {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: authEmail,
            code: authOtpCode,
            newPassword: authNewPassword,
          }),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Gagal mereset kata sandi.');
        setAuthUser(data.user);
        setDemoOtpHint(null);
        triggerToast('Kata sandi berhasil diperbarui & Anda telah masuk!');
      } else if (authMode === 'google-instant') {
        const res = await fetch('/api/auth/google-direct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: authEmail,
            name: authName || authEmail.split('@')[0],
          }),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Gagal masuk dengan Google.');
        setAuthUser(data.user);
        triggerToast(`Masuk dengan Akun Google: ${data.user.email}`);
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Terjadi kesalahan.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSignInClick = async () => {
    setAuthError(null);
    try {
      const res = await fetch(
        `/api/auth/google/url?origin=${encodeURIComponent(window.location.origin)}`
      );
      const data = await res.json();
      if (data.configured && data.url) {
        window.open(data.url, 'google_oauth_popup', 'width=540,height=660');
      } else {
        setAuthMode('google-instant');
      }
    } catch {
      setAuthMode('google-instant');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('specforge_auth_user');
    setAuthUser(null);
    setMessages([]);
    setActiveChatId('');
    setAuthPassword('');
  };

  const fetchAvailable9RouterCombos = async () => {
    setIsFetchingCombos(true);
    try {
      const cleanBase = (comboConfig.baseUrl || 'http://localhost:20128/v1').replace(/\/+$/, '');
      const modelsUrl = cleanBase.endsWith('/models') ? cleanBase : `${cleanBase}/models`;
      const headers: Record<string, string> = {};
      if (comboConfig.apiKey.trim()) {
        headers['Authorization'] = `Bearer ${comboConfig.apiKey.trim()}`;
      }
      const res = await fetch(modelsUrl, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list: string[] = Array.isArray(data?.data)
        ? data.data.map((m: any) => m.id || m.name).filter(Boolean)
        : [];
      if (list.length > 0) {
        setDetectedCombos(list.slice(0, 12));
        setComboConfig((prev) => ({ ...prev, comboName: list[0] }));
        triggerToast(`Ditemukan ${list.length} model/combo dari 9Router!`);
      } else {
        triggerToast('Terhubung ke 9Router, ketik nama combo Anda secara langsung.');
      }
    } catch {
      triggerToast('Pastikan aplikasi 9Router sedang berjalan di localhost:20128.');
    } finally {
      setIsFetchingCombos(false);
    }
  };

  // Call Active AI Provider (9Router Combo / Provider Mode, or Universal AI Provider)
  const executeActiveAI = async (prompt: string, expectJson: boolean) => {
    const nineRouterTarget =
      comboConfig.mode === 'provider'
        ? (comboConfig.providerName || 'gemini').trim()
        : (comboConfig.comboName || 'default').trim();

    let baseUrl = comboConfig.baseUrl || 'http://localhost:20128/v1';
    let apiKey = comboConfig.apiKey.trim();
    let modelName = nineRouterTarget || 'default';

    if (otherAiConfig.activeProvider !== '9router') {
      if (otherAiConfig.activeProvider === 'gemini' || otherAiConfig.activeProvider === 'anthropic') {
        // Handled via server proxy to avoid browser CORS restrictions
        throw new Error('USE_SERVER_PROXY');
      }
      const entry = getCurrentProviderEntry(otherAiConfig.activeProvider);
      baseUrl = entry.baseUrl || 'https://api.openai.com/v1';
      apiKey = (entry.apiKey || '').trim();
      modelName = (entry.model || 'gpt-4o-mini').trim();
    }

    const cleanBase = baseUrl.replace(/\/+$/, '');
    const endpoint = cleanBase.endsWith('/chat/completions')
      ? cleanBase
      : `${cleanBase}/chat/completions`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: modelName,
        messages: [
          ...(expectJson
            ? [
                {
                  role: 'system',
                  content:
                    'Anda adalah Principal Product Manager Indonesia. Anda WAJIB hanya mengembalikan objek JSON murni yang valid dalam Bahasa Indonesia tanpa blok markdown ```json.',
                },
              ]
            : [
                {
                  role: 'system',
                  content:
                    'Anda adalah Asisten Product Manager AI yang ramah dan terstruktur. Selalu gunakan Bahasa Indonesia.',
                },
              ]),
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`HTTP ${res.status}: ${txt.slice(0, 150)}`);
    }

    const data = await res.json();
    const content: string = data?.choices?.[0]?.message?.content || '';
    if (!expectJson) return content.trim();

    const cleaned = content
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch {
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
      }
      throw new Error('Format JSON dari model tidak lengkap');
    }
  };

  // Ensure Google Stitch prompt is always 100% Bahasa Indonesia
  const buildIndonesianStitchPrompt = (
    title: string,
    audience: string,
    features: string,
    uiStyle: string,
    aiStitchRaw?: string
  ) => {
    return `// Spesifikasi Prompt Desain UI Google Stitch (100% Bahasa Indonesia)
INSTRUKSI WAJIB UNTUK GOOGLE STITCH:
Buat desain antarmuka web/aplikasi modern di mana SELURUH teks di dalam layar, menu navigasi, tombol, label formulir, kartu metrik, tabel, dan notifikasi menggunakan BAHASA INDONESIA (JANGAN gunakan Bahasa Inggris).

Nama Produk / Web: "${title}"
Target Pengguna: ${audience || 'Pengguna bisnis & tim operasional di Indonesia'}
Gaya Visual & Tata Letak: ${uiStyle || 'Modern, bersih, profesional dengan dukungan Mode Terang & Gelap'}

Struktur & Komponen Layar Utama (Semua Teks Wajib Bahasa Indonesia):
1. Navigasi Utama: Menu "Beranda", "Manajemen Fitur Utama", "Data & Analitik", "Riwayat Aktivitas", dan "Pengaturan".
2. Ringkasan Metrik Atas: Kartu KPI dengan judul Bahasa Indonesia yang relevan dengan "${title}".
3. Area Kerja Inti: Menampilkan antarmuka interaktif untuk fitur: ${features || title} lengkap dengan tombol aksi dalam Bahasa Indonesia ("Tambah Baru", "Simpan Perubahan", "Filter Data", "Ekspor Laporan").
${aiStitchRaw ? `\nDetail Tambahan Spesifikasi Komponen:\n${aiStitchRaw}` : ''}`;
  };

  // Build tailored prompt for ANY AI tool (Universal AI, Cursor/Windsurf, v0, Bolt/Lovable, Claude/ChatGPT, Replit Agent, or Stitch)
  const buildPromptForAnyAI = (doc: PRDDocument, targetId: string): string => {
    const overrideKey = `${doc.id}_${targetId}`;
    if (customAiPromptOverrides[overrideKey] !== undefined) {
      return customAiPromptOverrides[overrideKey];
    }
    if (targetId === 'stitch') {
      return doc.stitchPromptSpec;
    }

    const sectionsText = doc.sections
      .map((s) => `### ${s.number}. ${s.title}\n${s.content}`)
      .join('\n\n');

    const storiesText = (doc.userStories || [])
      .map(
        (u, idx) =>
          `${idx + 1}. [${u.priority}] Sebagai ${u.persona}: ${u.story} (Kriteria: ${(u.acceptanceCriteria || []).join(', ')})`
      )
      .join('\n');

    const targetMeta =
      PROMPT_EXPORT_TARGETS.find((t) => t.id === targetId) || PROMPT_EXPORT_TARGETS[1];

    if (targetId === 'cursor') {
      return `# Master Prompt untuk Cursor IDE / Windsurf (${doc.title})
Anda adalah Senior Full-Stack Architect. Bangun aplikasi web produksi lengkap berdasarkan dokumen PRD "${doc.title}" (${doc.code}) berikut ini.

## Instruksi Utama:
- Gunakan TypeScript, React, Tailwind CSS, dan backend API yang bersih serta modular.
- Seluruh teks antarmuka pengguna (UI), label, tombol, pesan status, dan alur kerja WAJIB menggunakan **Bahasa Indonesia**.
- Buat tampilan yang responsif untuk layar HP (mobile-first drawer) maupun Laptop/Desktop, lengkap dengan Mode Gelap & Terang yang tersimpan otomatis.

## Ringkasan Eksekutif Produk:
${doc.summary}

## Spesifikasi Bab PRD Lengkap:
${sectionsText}

## Daftar User Stories & Acceptance Criteria:
${storiesText}

## Spesifikasi Desain UI & Komponen Layar:
${doc.stitchPromptSpec}

Silakan bangun struktur proyek, komponen utama, state management, dan endpoint secara berurutan hingga siap dijalankan tanpa placeholder.`;
    }

    if (targetId === 'v0') {
      return `// Prompt Desain & Komponen UI untuk v0 by Vercel (${doc.title})
Buatkan antarmuka aplikasi web modern menggunakan React, Tailwind CSS, dan Lucide React Icons untuk produk: "${doc.title}".

ATURAN PENTING:
1. Seluruh teks UI di layar (menu, tombol, tabel, form, badge, kartu KPI, dan modal) WAJIB 100% dalam BAHASA INDONESIA.
2. Desain harus responsif di layar HP dan Desktop, serta mendukung toggle Mode Gelap (Dark Mode) dan Mode Terang (Light Mode).
3. Semua tombol, tab, filter pencarian, dan formulir harus berfungsi secara interaktif (stateful).

Ringkasan Produk:
${doc.summary}

Detail Spesifikasi Antarmuka & Komponen:
${doc.stitchPromptSpec}

Fitur Utama yang Harus Ditampilkan di UI:
${doc.sections.map((s) => `- ${s.title}: ${s.content.slice(0, 220)}...`).join('\n')}`;
    }

    if (targetId === 'bolt') {
      return `# Prompt Full-Stack Web App untuk Bolt.new / Lovable (${doc.title})
Bangun aplikasi web full-stack yang langsung berfungsi penuh untuk **"${doc.title}"**.

## Kebutuhan Wajib:
1. **Bahasa Antarmuka**: 100% Bahasa Indonesia pada seluruh halaman, navigasi, formulir, dan notifikasi.
2. **Responsivitas**: Tampilan optimal untuk layar HP (mobile) maupun Laptop, dengan tema Terang & Gelap yang persisten.
3. **Fitur Lengkap Tanpa Mock Statis**: Semua proses tambah data, edit, hapus, filter pencarian, dan penyimpanan berjalan nyata.

## Ringkasan Produk:
${doc.summary}

## Rincian Kebutuhan Produk (PRD):
${sectionsText}

## Alur Pengguna (User Stories):
${storiesText}

## Panduan Tata Letak UI:
${doc.stitchPromptSpec}`;
    }

    if (targetId === 'claude') {
      return `Tolong buatkan aplikasi web interaktif yang lengkap dan siap pakai untuk produk **"${doc.title}"** berdasarkan spesifikasi Product Requirements Document (PRD) di bawah ini.

Pastikan:
- Seluruh antarmuka menggunakan Bahasa Indonesia yang jelas dan profesional.
- Mendukung pencarian data, tambah/edit/hapus item, Mode Gelap/Terang, dan responsif di layar HP maupun Desktop.

### Ringkasan Produk:
${doc.summary}

### Spesifikasi Lengkap PRD:
${sectionsText}

### Spesifikasi UI/UX:
${doc.stitchPromptSpec}`;
    }

    if (targetId === 'replit') {
      return `# Prompt Agen Otonom untuk Replit Agent / Cline (${doc.title})
Bangun, uji, dan jalankan aplikasi full-stack "${doc.title}" (${doc.code}) sesuai spesifikasi PRD berikut:

1. **Ringkasan**: ${doc.summary}
2. **Arsitektur & Fitur Inti**:
${sectionsText}
3. **User Stories & Kriteria Penerimaan**:
${storiesText}
4. **Spesifikasi Antarmuka (Wajib Bahasa Indonesia)**:
${doc.stitchPromptSpec}

Pastikan server backend, penyimpanan data, autentikasi, serta antarmuka frontend terhubung dengan baik dan bebas dari error.`;
    }

    // Default: 'universal' (Semua AI / Universal Prompt)
    return `# PROMPT AI UNIVERSAL — SIAP TEMPEL KE AI MANA SAJA (${targetMeta.label})
# Produk: ${doc.title} (${doc.code} · ${doc.version})

Anda adalah Senior Product Engineer & UI/UX Architect. Gunakan spesifikasi Product Requirements Document (PRD) di bawah ini untuk membangun/merancang aplikasi **"${doc.title}"** secara lengkap.

## 1. Instruksi Wajib
- Gunakan **Bahasa Indonesia** untuk seluruh teks antarmuka (menu, tombol, tabel, formulir, dan pesan sistem).
- Pastikan desain responsif untuk HP & Laptop serta mendukung Mode Gelap & Mode Terang.
- Implementasikan seluruh fitur utama dan alur pengguna secara fungsional.

## 2. Ringkasan Eksekutif
${doc.summary}

## 3. Spesifikasi Lengkap PRD
${sectionsText}

## 4. User Stories & Kriteria Penerimaan
${storiesText}

## 5. Spesifikasi Desain UI/UX (Google Stitch & Frontend)
${doc.stitchPromptSpec}`;
  };

  const handleStartNewChat = () => {
    setActiveChatId(`chat-${Date.now()}`);
    setMessages([]);
    setChatMode('new');
    setPromptInput('');
    setInterview({
      active: false,
      step: 0,
      awaitingConfirmation: false,
      revisingCurrentStep: false,
      productIdea: '',
      targetAudience: '',
      coreFeatures: '',
      uiDesignStyle: '',
      techAndIntegrations: '',
    });
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  // Button 1: "Revisi" -> Let user edit their answer for the current step
  const handleReviseStepAnswer = (stepNum: number) => {
    let previousVal = '';
    if (stepNum === 1) previousVal = interview.targetAudience;
    if (stepNum === 2) previousVal = interview.coreFeatures;
    if (stepNum === 3) previousVal = interview.uiDesignStyle;
    if (stepNum === 4) previousVal = interview.techAndIntegrations;

    setInterview((prev) => ({
      ...prev,
      step: stepNum,
      awaitingConfirmation: false,
      revisingCurrentStep: true,
    }));
    setPromptInput(previousVal);

    const qObj = INTERVIEW_QUESTIONS.find((q) => q.step === stepNum) || INTERVIEW_QUESTIONS[0];
    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    setMessages((prev) => [
      ...prev.map((m) => ({ ...m, isConfirmationCard: false, isReadyToGenerateCard: false })),
      {
        id: `ai-revise-${Date.now()}`,
        role: 'assistant',
        author: activeProviderBadgeLabel(),
        text: `Silakan perbarui jawaban Anda untuk **${qObj.title}**:\n\n${qObj.question}`,
        timestamp: nowTime,
      },
    ]);

    setTimeout(() => {
      inputRef.current?.focus();
    }, 80);
  };

  // Advance helper used by both "Gabungkan dengan Saran" and "Lanjutkan"
  const advanceToNextStepWithState = (updatedState: InterviewFlowState, mergedNotice?: string) => {
    const nextStep = updatedState.step + 1;
    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    if (nextStep <= 4) {
      const nextQ = INTERVIEW_QUESTIONS.find((q) => q.step === nextStep)!;
      const nextInterview: InterviewFlowState = {
        ...updatedState,
        step: nextStep,
        awaitingConfirmation: false,
        revisingCurrentStep: false,
      };
      setInterview(nextInterview);

      setMessages((prev) => [
        ...prev.map((m) => ({ ...m, isConfirmationCard: false })),
        {
          id: `ai-q-${nextStep}-${Date.now()}`,
          role: 'assistant',
          author: activeProviderBadgeLabel(),
          text: `${mergedNotice ? `✅ _${mergedNotice}_\n\n` : ''}**${nextQ.title}**\n\n${nextQ.question}`,
          timestamp: nowTime,
          interviewStep: nextStep,
        },
      ]);
      setTimeout(() => inputRef.current?.focus(), 80);
    } else {
      const finalInterview: InterviewFlowState = {
        ...updatedState,
        step: 5,
        awaitingConfirmation: false,
        revisingCurrentStep: false,
      };
      setInterview(finalInterview);

      setMessages((prev) => [
        ...prev.map((m) => ({ ...m, isConfirmationCard: false })),
        {
          id: `ai-ready-${Date.now()}`,
          role: 'assistant',
          author: activeProviderBadgeLabel(),
          text: `${mergedNotice ? `✅ _${mergedNotice}_\n\n` : ''}Semua kebutuhan untuk **${finalInterview.productIdea}** sudah lengkap dan jelas:\n\n1. **Target Pengguna & Tujuan:** ${finalInterview.targetAudience}\n2. **Fitur Utama:** ${finalInterview.coreFeatures}\n3. **Desain UI Google Stitch (Bahasa Indonesia):** ${finalInterview.uiDesignStyle}\n4. **Teknologi & Target:** ${finalInterview.techAndIntegrations}\n\nSilakan klik tombol **Buat PRD Sekarang** di bawah untuk menyusun dokumen PRD lengkap beserta prompt Google Stitch berbahasa Indonesia.`,
          timestamp: nowTime,
          isReadyToGenerateCard: true,
        },
      ]);
    }
  };

  // Toggle single AI suggestion item on a confirmation message card
  const handleToggleSuggestionItem = (msgId: string, item: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        const currentSelected = m.selectedSuggestions || [];
        const exists = currentSelected.includes(item);
        const nextSelected = exists
          ? currentSelected.filter((s) => s !== item)
          : [...currentSelected, item];
        return { ...m, selectedSuggestions: nextSelected };
      })
    );
  };

  // Toggle "Pilih Semua (10 Saran)" / "Batal Pilih Semua" on a confirmation message card
  const handleToggleSelectAllSuggestions = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        const allItems = m.aiSuggestionsList || [];
        const currentSelected = m.selectedSuggestions || [];
        const allSelected = currentSelected.length === allItems.length && allItems.length > 0;
        return {
          ...m,
          selectedSuggestions: allSelected ? [] : [...allItems],
        };
      })
    );
  };

  // Refresh ONLY the unchecked AI suggestions so they are replaced with brand-new suggestions that haven't been shown before
  const handleRefreshUncheckedSuggestions = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        const stepNum = m.interviewStep || 1;
        const currentList = m.aiSuggestionsList || [];
        const checkedSet = new Set(m.selectedSuggestions || []);
        const uncheckedCount = currentList.filter((item) => !checkedSet.has(item)).length;

        if (uncheckedCount === 0) {
          triggerToast(
            'Lepas centang pada saran yang ingin diganti, lalu klik Refresh Saran.'
          );
          return m;
        }

        const fullPool = getContextualAISuggestionsPool(
          stepNum,
          interview.productIdea,
          m.userAnswerText || ''
        );
        const alreadySeen = new Set([...(m.seenSuggestions || []), ...currentList]);

        // Pick unseen suggestions first
        let availableFresh = fullPool.filter((candidate) => !alreadySeen.has(candidate));

        // If the user has cycled through all 35 suggestions in the pool, reset unseen pool excluding currently displayed items
        if (availableFresh.length < uncheckedCount) {
          const currentDisplayedSet = new Set(currentList);
          const recycledPool = fullPool.filter((c) => !currentDisplayedSet.has(c));
          availableFresh = [
            ...availableFresh,
            ...recycledPool.filter((c) => !availableFresh.includes(c)),
          ];
        }

        let freshIdx = 0;
        const newlyAdded: string[] = [];
        const updatedList = currentList.map((item) => {
          if (checkedSet.has(item)) {
            return item; // Keep checked suggestions untouched!
          }
          const replacement = availableFresh[freshIdx];
          if (replacement) {
            freshIdx++;
            newlyAdded.push(replacement);
            return replacement;
          }
          return item;
        });

        triggerToast(`${newlyAdded.length} saran yang tidak dicentang berhasil diperbarui!`);

        return {
          ...m,
          aiSuggestionsList: updatedList,
          seenSuggestions: Array.from(new Set([...alreadySeen, ...newlyAdded])),
        };
      })
    );
  };

  // Button 2: "Gabungkan dengan Saran" -> Combines user's answer + selected AI suggestions (or all 10 if none manually checked) and moves to next question
  const handleMergeWithSuggestionAndProceed = (stepNum: number, selectedList: string[]) => {
    const finalSuggestions =
      selectedList && selectedList.length > 0
        ? selectedList
        : buildContextualAISuggestionsList(stepNum, interview.productIdea, '');
    const joinedSuggestions = finalSuggestions.join('; ');
    const updated = { ...interview };
    if (stepNum === 1) {
      updated.targetAudience = `${interview.targetAudience} — [Saran AI (${finalSuggestions.length} poin): ${joinedSuggestions}]`;
    } else if (stepNum === 2) {
      updated.coreFeatures = `${interview.coreFeatures} — [Saran AI (${finalSuggestions.length} poin): ${joinedSuggestions}]`;
    } else if (stepNum === 3) {
      updated.uiDesignStyle = `${interview.uiDesignStyle} — [Saran AI (${finalSuggestions.length} poin): ${joinedSuggestions}]`;
    } else if (stepNum === 4) {
      updated.techAndIntegrations = `${interview.techAndIntegrations} — [Saran AI (${finalSuggestions.length} poin): ${joinedSuggestions}]`;
    }
    advanceToNextStepWithState(
      updated,
      `Jawaban Tahap ${stepNum} berhasil digabungkan dengan ${finalSuggestions.length} saran AI pilihan Anda!`
    );
  };

  // Button 3: "Lanjutkan" -> Keeps user's answer as-is and moves to next question
  const handleProceedToNextStep = () => {
    advanceToNextStepWithState(interview);
  };

  const activeProviderBadgeLabel = () => {
    if (otherAiConfig.activeProvider === '9router') {
      if (comboConfig.mode === 'provider') {
        return `Provider: ${comboConfig.providerName || 'gemini'}`;
      }
      return `Combo: ${comboConfig.comboName || '9Router'}`;
    }
    const found = UNIVERSAL_AI_PROVIDERS.find((p) => p.id === otherAiConfig.activeProvider);
    if (found) {
      const shortName = found.name.split('(')[0].trim();
      return shortName;
    }
    return 'Nexus AI';
  };

  const getServerProviderPayload = () => {
    if (otherAiConfig.activeProvider === '9router') {
      const targetModelOrCombo =
        comboConfig.mode === 'provider'
          ? (comboConfig.providerName || 'gemini').trim()
          : (comboConfig.comboName || 'default').trim();
      return {
        provider: '9router',
        baseUrl: comboConfig.baseUrl || 'http://localhost:20128/v1',
        apiKey: comboConfig.apiKey,
        model: targetModelOrCombo || 'default',
        comboEnabled: false,
      };
    }
    const entry = getCurrentProviderEntry(otherAiConfig.activeProvider);
    if (otherAiConfig.activeProvider === 'gemini') {
      return {
        provider: 'gemini',
        apiKey: entry.apiKey,
        model: entry.model || 'gemini-3.8-flash',
      };
    }
    return {
      provider: otherAiConfig.activeProvider,
      baseUrl: entry.baseUrl,
      apiKey: entry.apiKey,
      model: entry.model,
    };
  };

  // Final Step Button: Click "Buat PRD Sekarang"
  const handleGenerateFinalPRDFromInterview = async () => {
    if (isGenerating || !authUser) return;
    setIsGenerating(true);

    const activeLabel = activeProviderBadgeLabel();
    const cleanedTitle =
      interview.productIdea
        .replace(/^(buatkan|rancang|susun|buat|saya ingin membuat|tolong buatkan)\s+(dokumen\s+)?(prd\s+)?(web\s+|aplikasi\s+)?(untuk\s+)?/i, '')
        .split(/[.,\n]/)[0]
        .slice(0, 75)
        .trim() || interview.productIdea.slice(0, 75);

    const fullBrief = `Ide Produk: ${interview.productIdea}. Target Pengguna & Masalah: ${interview.targetAudience}. Fitur Utama: ${interview.coreFeatures}. Gaya Desain UI Google Stitch (Wajib Bahasa Indonesia): ${interview.uiDesignStyle}. Stack Teknologi & Target: ${interview.techAndIntegrations}.`;

    const prdPrompt = `Anda adalah Principal Product Manager Indonesia.
Buatlah dokumen Product Requirements Document (PRD) lengkap 100% dalam Bahasa Indonesia berdasarkan hasil wawancara kebutuhan berikut:
- Nama / Ide Produk: ${cleanedTitle}
- Target Pengguna & Masalah: ${interview.targetAudience}
- Fitur Utama & Alur Kerja: ${interview.coreFeatures}
- Gaya Desain UI (Untuk Google Stitch): ${interview.uiDesignStyle}
- Spesifikasi Teknis & Integrasi: ${interview.techAndIntegrations}

PENTING UNTUK "stitchPromptSpec":
Tuliskan spesifikasi prompt untuk Google Stitch 100% dalam BAHASA INDONESIA, dan sertakan instruksi tegas di dalamnya agar Google Stitch membuat desain web dengan SELURUH teks, menu, tombol, dan tabel berbahasa Indonesia (bukan Bahasa Inggris).

Kembalikan HANYA objek JSON murni dengan struktur:
{
  "code": "PRD-2026-88",
  "summary": "Ringkasan eksekutif 2-3 kalimat dalam Bahasa Indonesia",
  "stitchPromptSpec": "Spesifikasi prompt desain UI Google Stitch dalam Bahasa Indonesia (wajib mencantumkan agar seluruh teks UI di layar menggunakan Bahasa Indonesia)",
  "sections": [
    { "number": "01", "title": "Ringkasan Eksekutif & Target Pengguna", "content": "..." },
    { "number": "02", "title": "Metrik Keberhasilan & KPI Kuantitatif", "content": "..." },
    { "number": "03", "title": "Alur Pengguna & Spesifikasi Fitur Utama", "content": "..." },
    { "number": "04", "title": "Arsitektur Teknis, Skema Data & Integrasi", "content": "..." },
    { "number": "05", "title": "Mitigasi Risiko & Kriteria Kesiapan Rilis", "content": "..." }
  ],
  "userStories": [
    {
      "persona": "Nama Persona (Bahasa Indonesia)",
      "story": "Sebagai ..., saya ingin ... agar ...",
      "acceptanceCriteria": ["Kriteria 1", "Kriteria 2", "Kriteria 3"],
      "priority": "P0 - Kritis",
      "storyPoints": 5
    }
  ]
}`;

    try {
      let parsed: any;
      try {
        parsed = await executeActiveAI(prdPrompt, true);
      } catch {
        const res = await fetch('/api/ai/generate-prd', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productName: cleanedTitle,
            productBrief: fullBrief,
            targetAudience: interview.targetAudience,
            techStack: interview.techAndIntegrations,
            keyGoals: interview.coreFeatures,
            ownerName: `${authUser.name} (${authUser.role})`,
            providerConfig: getServerProviderPayload(),
          }),
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error || 'Gagal menyusun PRD.');
        }
        const serverDoc: PRDDocument = {
          ...data.document,
          stitchPromptSpec: buildIndonesianStitchPrompt(
            cleanedTitle,
            interview.targetAudience,
            interview.coreFeatures,
            interview.uiDesignStyle,
            data.document.stitchPromptSpec
          ),
        };
        setDocuments((prev) => [serverDoc, ...prev.filter((d) => d.id !== serverDoc.id)]);
        setSelectedDocId(serverDoc.id);
        setChatMode('refine');
        setInterview((prev) => ({ ...prev, active: false, step: 0 }));
        setMessages((prev) => [
          ...prev.map((m) => ({ ...m, isReadyToGenerateCard: false })),
          {
            id: `ai-prd-${Date.now()}`,
            role: 'assistant',
            author: activeLabel,
            text: `Dokumen PRD **${serverDoc.title}** telah selesai disusun sesuai seluruh spesifikasi Anda! Prompt **Google Stitch** juga telah dikunci dalam **Bahasa Indonesia**.`,
            timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            prdDocId: serverDoc.id,
          },
        ]);
        return;
      }

      const nowFormatted = new Date().toISOString().slice(0, 16).replace('T', ' ');
      const indonesianStitchSpec = buildIndonesianStitchPrompt(
        cleanedTitle,
        interview.targetAudience,
        interview.coreFeatures,
        interview.uiDesignStyle,
        parsed.stitchPromptSpec
      );

      const newDoc: PRDDocument = {
        id: `prd-${Date.now()}`,
        title: cleanedTitle,
        code: parsed.code || `PRD-${Math.floor(100 + Math.random() * 900)}`,
        templateId: 'ai-combo',
        templateName: activeLabel,
        version: 'v1.0.0',
        status: 'Draf',
        ownerName: `${authUser.name} (${authUser.role})`,
        targetReleaseDate: new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10),
        updatedAt: new Date().toISOString(),
        summary: parsed.summary || fullBrief,
        stitchPromptSpec: indonesianStitchSpec,
        sections: (parsed.sections || []).map((sec: any, idx: number) => ({
          id: `sec-${Date.now()}-${idx}`,
          number: sec.number || `0${idx + 1}`,
          title: sec.title,
          content: sec.content,
          status: idx === 0 ? 'Disetujui' : 'Draf',
          lastEditedBy: `${authUser.name} (${activeLabel})`,
          lastEditedAt: nowFormatted,
        })),
        userStories: (parsed.userStories || []).map((us: any, idx: number) => ({
          id: `US-${Math.floor(300 + idx)}`,
          persona: us.persona || 'Pengguna Utama',
          story: us.story || '',
          acceptanceCriteria: us.acceptanceCriteria || [],
          priority: 'P0 - Kritis',
          storyPoints: us.storyPoints || 5,
          status: 'Backlog',
          assignee: authUser.name,
          syncedTo: [],
        })),
        revisions: [
          {
            id: `rev-${Date.now()}`,
            version: 'v1.0.0',
            timestamp: nowFormatted,
            authorName: authUser.name,
            authorRole: authUser.role,
            sectionId: 'all',
            sectionTitle: `00. Inisialisasi PRD Terstruktur (${activeLabel})`,
            changeSummary: `Menyusun PRD "${cleanedTitle}" setelah wawancara 4 tahap kebutuhan produk.`,
            previousContent: '(Dokumen Kosong)',
            newContent: parsed.summary || fullBrief,
          },
        ],
        comments: [],
        integrationLogs: [],
      };

      await fetch('/api/prds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDoc),
      });

      setDocuments((prev) => [newDoc, ...prev]);
      setSelectedDocId(newDoc.id);
      setChatMode('refine');
      setInterview((prev) => ({ ...prev, active: false, step: 0 }));
      setMessages((prev) => [
        ...prev.map((m) => ({ ...m, isReadyToGenerateCard: false })),
        {
          id: `ai-prd-${Date.now()}`,
          role: 'assistant',
          author: activeLabel,
          text: `Dokumen PRD **${newDoc.title}** telah selesai disusun sesuai hasil tanya-jawab kita! Prompt untuk **Google Stitch** juga sudah 100% menggunakan **Bahasa Indonesia**.`,
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          prdDocId: newDoc.id,
        },
      ]);
    } catch (err: any) {
      triggerToast(err?.message || 'Gagal menyusun PRD');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendPrompt = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = promptInput.trim();
    if (!text || isGenerating || !authUser) return;

    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const activeLabel = activeProviderBadgeLabel();

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      author: authUser.name,
      text,
      timestamp: nowTime,
    };

    setMessages((prev) => [
      ...prev.map((m) => ({ ...m, isConfirmationCard: false })),
      userMsg,
    ]);
    setPromptInput('');

    // CASE 1: Starting a brand-new conversation -> Check if it's a greeting/casual chat or an actual product idea
    if (messages.length === 0 || (chatMode === 'new' && !interview.active)) {
      const normalized = text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/gi, '')
        .trim();
      const greetingPatterns = [
        'halo',
        'hai',
        'hi',
        'hello',
        'hey',
        'p',
        'ping',
        'tes',
        'test',
        'assalamualaikum',
        'pagi',
        'siang',
        'sore',
        'malam',
        'selamat pagi',
        'selamat siang',
        'selamat sore',
        'selamat malam',
        'apa kabar',
        'halo ai',
        'halo nexus',
        'permisi',
        'bantu saya',
        'tolong',
      ];
      const isJustGreeting =
        greetingPatterns.includes(normalized) ||
        (/^(halo|hai|hi|hello|selamat\s+(pagi|siang|sore|malam)|assalamualaikum|tes|test)\b/i.test(
          normalized
        ) &&
          normalized.split(/\s+/).length <= 4 &&
          !/\b(web|aplikasi|app|sistem|platform|toko|kasir|catering|sekolah|klinik|booking|prd|produk|buat|bikin)\b/i.test(
            normalized
          ));

      if (isJustGreeting) {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-greeting-${Date.now()}`,
            role: 'assistant',
            author: activeLabel,
            text: `Halo juga, **${authUser.name.split(' ')[0]}**! 👋\n\nAda ide **website** atau **aplikasi** yang ingin kita rancang dokumen **PRD**-nya hari ini?\n\nSilakan ketik ide produk Anda (contoh: *"Saya ingin membuat website katering harian"*, *"Aplikasi kasir UMKM"*, atau *"Platform kursus online"*), nanti saya akan memandu Anda langkah demi langkah beserta 10 rekomendasi saran AI di setiap tahap!`,
            timestamp: nowTime,
          },
        ]);
        return;
      }

      const q1 = INTERVIEW_QUESTIONS[0];
      setInterview({
        active: true,
        step: 1,
        awaitingConfirmation: false,
        revisingCurrentStep: false,
        productIdea: text,
        targetAudience: '',
        coreFeatures: '',
        uiDesignStyle: '',
        techAndIntegrations: '',
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-intro-q1-${Date.now()}`,
          role: 'assistant',
          author: activeLabel,
          text: `Ide yang menarik! Sebelum saya menyusun dokumen PRD lengkap untuk **"${text}"**, mari kita perjelas kebutuhannya secara bertahap agar hasilnya akurat.\n\n**${q1.title}**\n${q1.question}`,
          timestamp: nowTime,
          interviewStep: 1,
        },
      ]);
      return;
    }

    // CASE 2: User is answering or revising a question inside the Guided Interview (Steps 1..4)
    // AI gives a smart suggestion and shows 3 buttons: [Gabungkan dengan Saran], [Lanjutkan], [Revisi]
    if (interview.active && interview.step >= 1 && interview.step <= 4) {
      const currentStepNum = interview.step;
      const updatedInterview = { ...interview };

      if (currentStepNum === 1) updatedInterview.targetAudience = text;
      if (currentStepNum === 2) updatedInterview.coreFeatures = text;
      if (currentStepNum === 3) updatedInterview.uiDesignStyle = text;
      if (currentStepNum === 4) updatedInterview.techAndIntegrations = text;

      updatedInterview.awaitingConfirmation = true;
      updatedInterview.revisingCurrentStep = false;
      setInterview(updatedInterview);

      const stepLabels: Record<number, string> = {
        1: 'Target Pengguna & Tujuan Utama',
        2: 'Fitur Utama & Alur Kerja',
        3: 'Desain Tampilan UI Google Stitch (Bahasa Indonesia)',
        4: 'Spesifikasi Teknis & Integrasi',
      };

      const suggestions10 = buildContextualAISuggestionsList(
        currentStepNum,
        updatedInterview.productIdea,
        text
      );

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-confirm-${currentStepNum}-${Date.now()}`,
          role: 'assistant',
          author: activeLabel,
          text: `**Jawaban Anda (${stepLabels[currentStepNum]}):**\n"${text}"\n\n💡 **10 Rekomendasi Saran AI (Bisa pilih beberapa atau Pilih Semua):**\nSilakan centang saran di bawah yang ingin digabungkan ke jawaban Anda, lalu klik **Gabungkan dengan Saran**, **Lanjutkan**, atau **Revisi**:`,
          timestamp: nowTime,
          interviewStep: currentStepNum,
          userAnswerText: text,
          aiSuggestionText: suggestions10.join('; '),
          aiSuggestionsList: suggestions10,
          selectedSuggestions: [...suggestions10],
          seenSuggestions: [...suggestions10],
          isConfirmationCard: true,
        },
      ]);
      return;
    }

    // CASE 3: Refining an existing PRD document via chat
    if (currentDoc) {
      setIsGenerating(true);
      try {
        const targetSection =
          currentDoc.sections.find(
            (s) =>
              text.toLowerCase().includes(s.number.toLowerCase()) ||
              text.toLowerCase().includes(s.title.toLowerCase().split(' ')[0])
          ) || currentDoc.sections[0];

        const refinePrompt = `Perbarui dan pertajam bagian PRD "${targetSection.number}. ${targetSection.title}" pada produk "${currentDoc.title}" dalam Bahasa Indonesia.\nIsi saat ini:\n${targetSection.content}\n\nInstruksi Revisi: ${text}\n\nKembalikan langsung teks isi bagian yang sudah diperbarui.`;

        let refinedText = '';
        try {
          refinedText = await executeActiveAI(refinePrompt, false);
        } catch {
          const res = await fetch('/api/ai/refine-section', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              docTitle: currentDoc.title,
              sectionTitle: `${targetSection.number}. ${targetSection.title}`,
              currentContent: targetSection.content,
              instruction: text,
              providerConfig: getServerProviderPayload(),
            }),
          });
          const data = await res.json();
          if (!res.ok || data.error) {
            throw new Error(data.error || 'Gagal merevisi bagian PRD.');
          }
          refinedText = data.refinedContent;
        }

        if (refinedText) {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              JSON.stringify({
                type: 'doc:update_section',
                docId: currentDoc.id,
                sectionId: targetSection.id,
                title: targetSection.title,
                content: refinedText,
                status: 'Ditinjau',
                authorName: `${authUser.name} (${activeLabel})`,
                authorRole: authUser.role,
                changeSummary: `Revisi via ${activeLabel}: ${text.slice(0, 75)}`,
              })
            );
          }

          setMessages((prev) => [
            ...prev,
            {
              id: `ai-${Date.now()}`,
              role: 'assistant',
              author: activeLabel,
              text: `Bab **${targetSection.number}. ${targetSection.title}** telah berhasil direvisi dan disimpan ke dalam riwayat revisi real-time:`,
              timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
              prdDocId: currentDoc.id,
            },
          ]);
          triggerToast(`Bab ${targetSection.number} berhasil direvisi!`);
        }
      } catch (err: any) {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            author: activeLabel,
            text: `${err?.message || 'Gagal memproses permintaan.'}`,
            timestamp: nowTime,
          },
        ]);
      } finally {
        setIsGenerating(false);
      }
    }
  };

  const handleSaveManualEdit = () => {
    if (!currentDoc || !authUser) return;
    const sec = currentDoc.sections.find((s) => s.id === editingSectionId) || currentDoc.sections[0];
    if (!sec) return;

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'doc:update_section',
          docId: currentDoc.id,
          sectionId: sec.id,
          title: draftTitle,
          content: draftContent,
          status: draftStatus,
          authorName: authUser.name,
          authorRole: authUser.role,
          changeSummary: changeNote.trim() || `Memperbarui Bab ${sec.number}: ${draftTitle}`,
        })
      );
    }
    setChangeNote('');
    setActiveModal('none');
    triggerToast(`Revisi Bab ${sec.number} berhasil disimpan.`);
  };

  const handleSyncIntegration = async (tool: 'Google Stitch' | 'Trello' | 'Jira') => {
    if (!currentDoc) return;
    setIsSyncingIntegration(true);
    try {
      const res = await fetch('/api/integrations/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docId: currentDoc.id,
          tool,
          stitchWorkspaceName,
          trelloApiKey,
          trelloToken,
          trelloListId,
          jiraDomain,
          jiraEmail,
          jiraApiToken,
          jiraProjectKey,
        }),
      });
      const data = await res.json();
      if (data.document) {
        setDocuments((prev) =>
          prev.map((d) => (d.id === data.document.id ? data.document : d))
        );
        triggerToast(`Berhasil menyinkronkan ke ${tool}!`);
      }
    } catch (err) {
      console.error('Integration error:', err);
    } finally {
      setIsSyncingIntegration(false);
    }
  };

  const handleRestoreRevision = (revId: string) => {
    if (!currentDoc || !authUser) return;
    const rev = currentDoc.revisions.find((r) => r.id === revId);
    if (!rev) return;
    const targetSec = currentDoc.sections.find((s) => s.id === rev.sectionId);
    if (!targetSec) return;

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'doc:update_section',
          docId: currentDoc.id,
          sectionId: targetSec.id,
          title: targetSec.title,
          content: rev.newContent,
          status: targetSec.status,
          authorName: authUser.name,
          authorRole: authUser.role,
          changeSummary: `Memulihkan isi bab ke versi ${rev.version}`,
        })
      );
      triggerToast(`Isi bab dipulihkan ke versi ${rev.version}.`);
    }
  };

  const activeRevision =
    currentDoc?.revisions.find((r) => r.id === selectedRevisionId) ||
    currentDoc?.revisions[0];

  const totalStoryPoints =
    currentDoc?.userStories.reduce((acc, s) => acc + s.storyPoints, 0) || 0;
  const completedStoryPoints =
    currentDoc?.userStories
      .filter((s) => s.status === 'Selesai')
      .reduce((acc, s) => acc + s.storyPoints, 0) || 0;

  // Theme Color Tokens (Light vs Dark)
  const bgMain = darkMode ? 'bg-[#131314] text-[#E3E3E3]' : 'bg-white text-[#1F1F1F]';
  const bgSidebar = darkMode
    ? 'bg-[#1E1F20] border-[#333537]'
    : 'bg-[#F0F4F9] border-[#E3E3E3]/60';
  const bgOmnibox = darkMode
    ? 'bg-[#1E1F20] text-[#E3E3E3] focus-within:bg-[#282A2C] border-[#333537]'
    : 'bg-[#F0F4F9] text-[#1F1F1F] focus-within:bg-white border-transparent focus-within:border-[#D3E3FD]';
  const bgCard = darkMode
    ? 'bg-[#1E1F20] border-[#333537]'
    : 'bg-[#F8FAFD] border-[#E3E3E3]';
  const bgSubCard = darkMode
    ? 'bg-[#131314] border-[#333537]'
    : 'bg-white border-[#E3E3E3]';
  const textMuted = darkMode ? 'text-[#C4C7C5]' : 'text-[#444746]';

  // ============================================================================
  // AUTH SCREEN: LOGIN, REGISTER, FORGOT PASSWORD (6-DIGIT EMAIL OTP) & GOOGLE
  // ============================================================================
  if (!authUser) {
    return (
      <div className={`min-h-screen flex flex-col justify-between p-4 transition-colors ${bgMain}`}>
        <div className="flex items-center justify-between px-4 py-2">
          <span className="font-display text-lg font-bold tracking-tight">Nexus PRD</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2.5 rounded-full cursor-pointer ${
                darkMode ? 'bg-[#1E1F20] text-[#E3E3E3]' : 'bg-[#F0F4F9] text-[#1F1F1F]'
              }`}
              title="Mode Terang / Gelap"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <OfflineIndicator />

        <div className="flex-1 flex items-center justify-center">
          <div className={`w-full max-w-md border rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm ${bgCard}`}>
            <div className="text-center space-y-1.5">
              <h1 className="font-display text-2xl font-bold">
                {authMode === 'login' && 'Masuk ke Akun Anda'}
                {authMode === 'register' && 'Daftar Akun Baru'}
                {authMode === 'forgot-email' && 'Lupa Kata Sandi'}
                {authMode === 'forgot-otp' && 'Verifikasi Kode 6 Digit'}
                {authMode === 'google-instant' && 'Masuk dengan Akun Google'}
              </h1>
              <p className={`text-xs ${textMuted}`}>
                {authMode === 'login' &&
                  'Riwayat chat PRD dan pengaturan API Key Anda tersimpan aman di akun Anda.'}
                {authMode === 'register' &&
                  'Daftar menggunakan email Anda untuk menyimpan riwayat chat & API Key pribadi.'}
                {authMode === 'forgot-email' &&
                  'Masukkan email Anda untuk menerima kode verifikasi 6 digit reset kata sandi.'}
                {authMode === 'forgot-otp' &&
                  `Masukkan kode 6 digit yang dikirim ke ${authEmail} beserta kata sandi baru.`}
                {authMode === 'google-instant' &&
                  'Masukkan email Google Anda untuk langsung masuk dan menyinkronkan ruang kerja.'}
              </p>
            </div>

            {authError && (
              <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-medium">
                {authError}
              </div>
            )}

            {authInfo && (
              <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-[#4285F4] text-xs font-medium space-y-1">
                <div>{authInfo}</div>
                {demoOtpHint && (
                  <div className="font-mono font-bold text-sm pt-1">
                    Kode 6 Digit Anda: <span className="underline">{demoOtpHint}</span>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4 text-xs">
              {(authMode === 'register' || authMode === 'google-instant') && (
                <div>
                  <label className="block font-semibold mb-1.5">Nama Lengkap</label>
                  <div className="relative">
                    <UserIcon className={`w-4 h-4 absolute left-3.5 top-3 ${textMuted}`} />
                    <input
                      type="text"
                      required
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      placeholder="Nama lengkap Anda"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none focus:border-[#4285F4] ${bgSubCard}`}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold mb-1.5">Alamat Email</label>
                <div className="relative">
                  <Mail className={`w-4 h-4 absolute left-3.5 top-3 ${textMuted}`} />
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none focus:border-[#4285F4] ${bgSubCard}`}
                  />
                </div>
              </div>

              {(authMode === 'login' || authMode === 'register') && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-semibold">Kata Sandi</label>
                    {authMode === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setAuthError(null);
                          setAuthInfo(null);
                          setAuthMode('forgot-email');
                        }}
                        className="text-[#4285F4] hover:underline font-medium cursor-pointer"
                      >
                        Lupa kata sandi?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className={`w-4 h-4 absolute left-3.5 top-3 ${textMuted}`} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="Masukkan kata sandi"
                      className={`w-full pl-10 pr-10 py-2.5 rounded-xl border focus:outline-none focus:border-[#4285F4] ${bgSubCard}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute right-3 top-2.5 p-0.5 cursor-pointer ${textMuted}`}
                      title={showPassword ? 'Sembunyikan sandi' : 'Lihat sandi'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {authMode === 'forgot-otp' && (
                <>
                  <div>
                    <label className="block font-semibold mb-1.5">Kode Verifikasi 6 Digit</label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={authOtpCode}
                      onChange={(e) => setAuthOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="Contoh: 482910"
                      className={`w-full px-4 py-2.5 rounded-xl border font-mono text-center text-base tracking-widest focus:outline-none focus:border-[#4285F4] ${bgSubCard}`}
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1.5">Kata Sandi Baru</label>
                    <div className="relative">
                      <Lock className={`w-4 h-4 absolute left-3.5 top-3 ${textMuted}`} />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={authNewPassword}
                        onChange={(e) => setAuthNewPassword(e.target.value)}
                        placeholder="Masukkan kata sandi baru"
                        className={`w-full pl-10 pr-10 py-2.5 rounded-xl border focus:outline-none focus:border-[#4285F4] ${bgSubCard}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className={`absolute right-3 top-2.5 p-0.5 cursor-pointer ${textMuted}`}
                        title={showNewPassword ? 'Sembunyikan sandi' : 'Lihat sandi'}
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2.5 rounded-full bg-[#0B57D0] hover:bg-[#0842A0] text-white font-semibold transition-colors cursor-pointer"
              >
                {authLoading
                  ? 'Memproses...'
                  : authMode === 'login'
                  ? 'Masuk'
                  : authMode === 'register'
                  ? 'Daftar dengan Email'
                  : authMode === 'forgot-email'
                  ? 'Kirim Kode 6 Digit ke Email'
                  : authMode === 'forgot-otp'
                  ? 'Verifikasi Kode & Simpan Kata Sandi'
                  : 'Lanjutkan dengan Akun Google'}
              </button>
            </form>

            {(authMode === 'login' || authMode === 'register') && (
              <>
                <div className="relative flex py-1 items-center">
                  <div className={`flex-grow border-t ${darkMode ? 'border-[#333537]' : 'border-[#E3E3E3]'}`} />
                  <span className={`shrink mx-3 text-[11px] ${textMuted}`}>atau</span>
                  <div className={`flex-grow border-t ${darkMode ? 'border-[#333537]' : 'border-[#E3E3E3]'}`} />
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignInClick}
                  className={`w-full py-2.5 px-4 rounded-full border text-xs font-semibold flex items-center justify-center gap-2.5 transition-colors cursor-pointer ${bgSubCard}`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>Masuk dengan Google</span>
                </button>
              </>
            )}

            <div className="text-center text-xs pt-1">
              {authMode === 'login' ? (
                <span className={textMuted}>
                  Belum punya akun?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthError(null);
                      setAuthInfo(null);
                      setAuthMode('register');
                    }}
                    className="text-[#4285F4] font-semibold hover:underline cursor-pointer"
                  >
                    Daftar Sekarang
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setAuthError(null);
                    setAuthInfo(null);
                    setAuthMode('login');
                  }}
                  className="text-[#4285F4] font-semibold hover:underline cursor-pointer"
                >
                  Kembali ke Halaman Masuk (Login)
                </button>
              )}
            </div>
          </div>
        </div>

        <div className={`text-center text-[11px] py-2 ${textMuted}`}>
          Akun Demo Cepat: <span className="font-mono">nadia@specforge.id</span> / Sandi: <span className="font-mono">123456</span>
        </div>
      </div>
    );
  }

  const currentQuestionPlaceholder =
    interview.active && interview.step >= 1 && interview.step <= 4
      ? INTERVIEW_QUESTIONS[interview.step - 1].placeholder
      : 'Ketik ide web/aplikasi yang ingin dibuat PRD-nya...';

  const filteredChatSessions = chatSessions.filter((chat) => {
    const q = chatSearchQuery.trim().toLowerCase();
    if (!q) return true;
    const matchTitle = chat.title.toLowerCase().includes(q);
    const matchMessages = (chat.messages || []).some((m) =>
      m.text.toLowerCase().includes(q)
    );
    return matchTitle || matchMessages;
  });

  return (
    <div className={`h-[100dvh] w-full flex overflow-hidden relative transition-colors duration-150 ${bgMain}`}>
      {/* MOBILE OVERLAY BACKDROP WHEN SIDEBAR IS OPEN */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-xs md:hidden"
          aria-hidden="true"
        />
      )}

      {/* LEFT SIDEBAR: Persistent Chat History (Search, Pin, Edit Title, Delete) */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 ${
          sidebarOpen
            ? 'translate-x-0 w-72'
            : '-translate-x-full md:translate-x-0 w-72 md:w-16'
        } shrink-0 flex flex-col justify-between transition-all duration-200 border-r ${bgSidebar}`}
      >
        <div className="p-3 space-y-3 overflow-y-auto flex-1">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`p-2.5 rounded-full transition-colors cursor-pointer ${
                darkMode ? 'hover:bg-[#333537] text-[#C4C7C5]' : 'hover:bg-[#E1E7EE] text-[#444746]'
              }`}
              title="Menu Samping"
            >
              <PanelLeft className="w-5 h-5" />
            </button>

            {sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(false)}
                className="md:hidden p-2 rounded-full hover:bg-black/10 cursor-pointer"
                title="Tutup Menu"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div>
            <button
              onClick={handleStartNewChat}
              className={`${
                sidebarOpen ? 'px-4 py-2.5 w-full justify-start' : 'p-2.5 justify-center w-full'
              } ${
                darkMode
                  ? 'bg-[#282A2C] hover:bg-[#333537] text-[#E3E3E3]'
                  : 'bg-[#D3E3FD] hover:bg-[#C2E7FF] text-[#041E49]'
              } rounded-full text-xs font-semibold transition-colors flex items-center gap-2.5 cursor-pointer`}
              title="Chat Baru"
            >
              <Plus className="w-4 h-4 shrink-0" />
              {sidebarOpen && <span className="whitespace-nowrap">Chat PRD Baru</span>}
            </button>
          </div>

          {!sidebarOpen && (
            <div className="hidden md:flex justify-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className={`p-2.5 rounded-full transition-colors cursor-pointer ${
                  darkMode ? 'hover:bg-[#333537] text-[#C4C7C5]' : 'hover:bg-[#E1E7EE] text-[#444746]'
                }`}
                title="Cari Riwayat Chat"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          )}

          {sidebarOpen && (
            <div className="space-y-2 pt-1">
              {/* SEARCH BAR FOR CHAT HISTORY */}
              <div className="relative">
                <Search className={`w-3.5 h-3.5 absolute left-3 top-2.5 ${textMuted}`} />
                <input
                  type="text"
                  value={chatSearchQuery}
                  onChange={(e) => setChatSearchQuery(e.target.value)}
                  placeholder="Cari riwayat chat..."
                  className={`w-full pl-8 pr-7 py-2 rounded-full border text-xs focus:outline-none focus:border-[#4285F4] ${bgSubCard}`}
                />
                {chatSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setChatSearchQuery('')}
                    className={`absolute right-2.5 top-2 p-0.5 rounded-full hover:opacity-80 cursor-pointer ${textMuted}`}
                    title="Bersihkan pencarian"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className={`px-3 py-1 text-[11px] font-semibold uppercase tracking-wider flex items-center justify-between ${textMuted}`}>
                <span>Riwayat Chat Tersimpan</span>
                <span>{filteredChatSessions.length}</span>
              </div>

              {chatSessions.length === 0 ? (
                <div className={`px-3 py-2 text-xs ${textMuted}`}>
                  Belum ada riwayat chat. Mulai ketik ide PRD di bawah.
                </div>
              ) : filteredChatSessions.length === 0 ? (
                <div className={`px-3 py-2 text-xs ${textMuted}`}>
                  Tidak ditemukan riwayat chat untuk "{chatSearchQuery}".
                </div>
              ) : (
                filteredChatSessions.map((chat) => {
                  const isSelected = chat.id === activeChatId;
                  const isEditing = editingChatId === chat.id;

                  return (
                    <div
                      key={chat.id}
                      onClick={() => !isEditing && handleSelectChatSession(chat)}
                      className={`group w-full px-3 py-2 rounded-2xl text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                        isSelected
                          ? darkMode
                            ? 'bg-[#004A77] text-[#C2E7FF] font-semibold'
                            : 'bg-[#C2E7FF] text-[#001D35] font-semibold'
                          : darkMode
                          ? 'text-[#E3E3E3] hover:bg-[#333537]'
                          : 'text-[#1F1F1F] hover:bg-[#E1E7EE]/80'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {chat.pinned ? (
                          <Pin className="w-3.5 h-3.5 shrink-0 text-[#4285F4] fill-current" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 shrink-0 opacity-75" />
                        )}

                        {isEditing ? (
                          <form
                            onSubmit={(e) => handleSaveChatRename(chat.id, e)}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 flex-1"
                          >
                            <input
                              type="text"
                              autoFocus
                              value={editingChatTitle}
                              onChange={(e) => setEditingChatTitle(e.target.value)}
                              onBlur={() => handleSaveChatRename(chat.id)}
                              className={`w-full px-2 py-0.5 rounded border text-xs ${bgSubCard}`}
                            />
                          </form>
                        ) : (
                          <span className="truncate">{chat.title}</span>
                        )}
                      </div>

                      {/* Pin, Edit Title, Delete Actions */}
                      {!isEditing && (
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => handleTogglePinChat(chat, e)}
                            className="p-1 rounded-full hover:bg-black/10 cursor-pointer"
                            title={chat.pinned ? 'Lepas Sematan' : 'Sematkan Chat'}
                          >
                            <Pin className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingChatId(chat.id);
                              setEditingChatTitle(chat.title);
                            }}
                            className="p-1 rounded-full hover:bg-black/10 cursor-pointer"
                            title="Edit Judul Chat"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteChat(chat.id, e)}
                            className="p-1 rounded-full hover:bg-red-500/20 text-red-500 cursor-pointer"
                            title="Hapus Riwayat Chat"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* User Profile & Logout Footer */}
        <div
          className={`p-3 border-t ${
            darkMode ? 'border-[#333537]' : 'border-[#E3E3E3]'
          }`}
        >
          {sidebarOpen ? (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate">{authUser.name}</div>
                <div className={`text-[11px] truncate ${textMuted}`}>{authUser.email}</div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-full hover:bg-red-500/15 text-red-500 transition-colors cursor-pointer shrink-0"
                title="Keluar (Logout)"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="p-2.5 mx-auto flex rounded-full hover:bg-red-500/15 text-red-500 transition-colors cursor-pointer"
              title="Keluar (Logout)"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* MAIN NEXUS PRD CHAT AREA */}
      <div className="flex-1 min-w-0 flex flex-col h-full relative">
        {/* Top Bar Contract */}
        <header className="h-14 sm:h-16 px-3 sm:px-6 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className={`md:hidden p-2 rounded-full transition-colors cursor-pointer shrink-0 ${
                darkMode ? 'hover:bg-[#333537] text-[#C4C7C5]' : 'hover:bg-[#E1E7EE] text-[#444746]'
              }`}
              title="Buka Riwayat Chat & Menu"
            >
              <PanelLeft className="w-5 h-5" />
            </button>
            <a
              href="#chat"
              onClick={(e) => {
                e.preventDefault();
                handleStartNewChat();
              }}
              className="font-display text-base sm:text-lg font-semibold tracking-tight whitespace-nowrap truncate"
            >
              Nexus PRD
            </a>
          </div>

          <nav className={`hidden md:flex items-center gap-6 text-xs font-medium ${textMuted}`}>
            <button
              onClick={() => setActiveModal('integrations')}
              className="hover:opacity-100 opacity-85 transition-opacity whitespace-nowrap cursor-pointer"
            >
              Prompt AI Universal (Stitch · Cursor · v0 · Bolt · Jira · Trello)
            </button>
            <button
              onClick={() => setActiveModal('revisions')}
              className="hover:opacity-100 opacity-85 transition-opacity whitespace-nowrap cursor-pointer"
            >
              Revisi Real-Time ({currentDoc?.revisions.length || 0})
            </button>
            <button
              onClick={() => setActiveModal('collaboration')}
              className="hover:opacity-100 opacity-85 transition-opacity whitespace-nowrap cursor-pointer"
            >
              Dasbor Kolaborasi
            </button>
            <button
              onClick={() => currentDoc && exportPRDToZipBundle(currentDoc)}
              className="hover:opacity-100 opacity-85 transition-opacity whitespace-nowrap cursor-pointer"
            >
              Ekspor ZIP
            </button>
            <button
              onClick={() => currentDoc && exportPRDToPDF(currentDoc)}
              className="hover:opacity-100 opacity-85 transition-opacity whitespace-nowrap cursor-pointer"
            >
              Ekspor PDF
            </button>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => setActiveModal('ai-settings')}
              className={`px-2.5 sm:px-3.5 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                darkMode
                  ? 'bg-[#1E1F20] hover:bg-[#333537] text-[#A8C7FA] border border-[#333537]'
                  : 'bg-[#F0F4F9] hover:bg-[#E1E7EE] text-[#0B57D0]'
              }`}
              title="Pengaturan 9Router Combo & API Key AI Pribadi"
            >
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span className="max-w-[95px] sm:max-w-none truncate">{activeProviderBadgeLabel()}</span>
            </button>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 sm:p-2.5 rounded-full transition-colors cursor-pointer shrink-0 ${
                darkMode
                  ? 'bg-[#1E1F20] hover:bg-[#333537] text-[#E3E3E3]'
                  : 'bg-[#F0F4F9] hover:bg-[#E1E7EE] text-[#1F1F1F]'
              }`}
              title={darkMode ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
              aria-label="Toggle Tema Terang atau Gelap"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>
        <OfflineIndicator />

        {/* Toast Notification */}
        {toastMessage && (
          <div className="mx-auto max-w-md px-4 py-2 rounded-full bg-[#0B57D0] text-white text-xs font-medium flex items-center justify-center gap-2 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* CENTER STREAM: Completely Clean When Empty */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 flex flex-col">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center pb-8">
              <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
                <span className="gemini-gradient-text">
                  Halo, {authUser.name.split(' ')[0]}
                </span>
              </h1>
            </div>
          ) : (
            <div className="max-w-3xl w-full mx-auto py-6 space-y-8">
              {messages.map((msg) => {
                const attachedDoc = msg.prdDocId
                  ? documents.find((d) => d.id === msg.prdDocId) || currentDoc
                  : null;

                if (msg.role === 'user') {
                  const isLongPrompt =
                    msg.text.length > 220 || msg.text.split('\n').length > 4;
                  const isExpanded = !!expandedUserMsgIds[msg.id];
                  const isCopied = copiedMsgId === msg.id;

                  return (
                    <div key={msg.id} className="flex flex-col items-end gap-1.5 group">
                      <div
                        className={`relative max-w-[85%] px-5 py-3.5 rounded-3xl rounded-tr-sm text-sm leading-relaxed transition-all ${
                          darkMode
                            ? 'bg-[#282A2C] text-[#E3E3E3]'
                            : 'bg-[#F0F4F9] text-[#1F1F1F]'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`whitespace-pre-line break-words flex-1 ${
                              isLongPrompt && !isExpanded ? 'line-clamp-4 overflow-hidden' : ''
                            }`}
                          >
                            {msg.text}
                          </div>

                          {isLongPrompt && (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedUserMsgIds((prev) => ({
                                  ...prev,
                                  [msg.id]: !prev[msg.id],
                                }))
                              }
                              className={`p-1 -mr-1.5 -mt-0.5 rounded-full transition-colors cursor-pointer shrink-0 ${
                                darkMode
                                  ? 'hover:bg-[#333537] text-[#C4C7C5]'
                                  : 'hover:bg-[#E1E7EE] text-[#444746]'
                              }`}
                              title={
                                isExpanded
                                  ? 'Sembunyikan sebagian prompt'
                                  : 'Tampilkan seluruh prompt'
                              }
                              aria-label={
                                isExpanded
                                  ? 'Sembunyikan sebagian prompt'
                                  : 'Tampilkan seluruh prompt'
                              }
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Baris Aksi Pesan Pengguna (Salin Prompt & Lihat Selengkapnya) */}
                      <div className="flex items-center gap-2 pr-1">
                        {isLongPrompt && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedUserMsgIds((prev) => ({
                                ...prev,
                                [msg.id]: !prev[msg.id],
                              }))
                            }
                            className={`px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                              darkMode
                                ? 'text-[#C4C7C5] hover:bg-[#1E1F20] hover:text-[#E3E3E3]'
                                : 'text-[#444746] hover:bg-[#F0F4F9] hover:text-[#1F1F1F]'
                            }`}
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-3.5 h-3.5" />
                                <span>Ringkas</span>
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3.5 h-3.5" />
                                <span>Lihat semua</span>
                              </>
                            )}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(msg.text);
                            setCopiedMsgId(msg.id);
                            triggerToast('Pesan prompt berhasil disalin!');
                            setTimeout(() => {
                              setCopiedMsgId((prev) => (prev === msg.id ? null : prev));
                            }, 2000);
                          }}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                            darkMode
                              ? 'text-[#C4C7C5] hover:bg-[#1E1F20] hover:text-[#E3E3E3]'
                              : 'text-[#444746] hover:bg-[#F0F4F9] hover:text-[#1F1F1F]'
                          }`}
                          title="Salin pesan saya"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="text-emerald-500 font-semibold">Disalin</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Salin</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className="space-y-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#4285F4]">
                      <Sparkles className="w-4 h-4 shrink-0" />
                      <span>{msg.author}</span>
                    </div>

                    <div className="text-sm leading-relaxed whitespace-pre-line pl-6">
                      {msg.text.split(/(\*\*.*?\*\*)/g).map((part, pIdx) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                          return (
                            <strong key={pIdx} className="font-semibold">
                              {part.slice(2, -2)}
                            </strong>
                          );
                        }
                        return <React.Fragment key={pIdx}>{part}</React.Fragment>;
                      })}
                    </div>

                    {/* 10 SARAN AI INTERAKTIF (BISA PILIH SATU PER SATU ATAU PILIH SEMUA) + 3 TOMBOL AKSI */}
                    {msg.isConfirmationCard && msg.interviewStep && (
                      <div className="pl-6 space-y-3 pt-1">
                        {msg.aiSuggestionsList && msg.aiSuggestionsList.length > 0 && (
                          <div className={`border rounded-2xl p-4 space-y-3 ${bgCard}`}>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-xs font-bold text-[#4285F4]">
                                Pilih Saran AI ({(msg.selectedSuggestions || []).length} dari{' '}
                                {msg.aiSuggestionsList.length} dipilih)
                              </span>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleRefreshUncheckedSuggestions(msg.id)}
                                  className={`px-3 py-1 rounded-full text-[11px] font-semibold border flex items-center gap-1 transition-colors cursor-pointer ${bgSubCard}`}
                                  title="Ganti saran yang tidak dicentang dengan saran baru yang berbeda"
                                >
                                  <RefreshCw className="w-3 h-3 text-[#4285F4]" />
                                  <span>
                                    Refresh yang Tidak Dicentang (
                                    {msg.aiSuggestionsList.length -
                                      (msg.selectedSuggestions || []).length}
                                    )
                                  </span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleToggleSelectAllSuggestions(msg.id)}
                                  className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer ${
                                    (msg.selectedSuggestions || []).length ===
                                    msg.aiSuggestionsList.length
                                      ? 'bg-[#0B57D0] text-white border-[#0B57D0]'
                                      : bgSubCard
                                  }`}
                                >
                                  {(msg.selectedSuggestions || []).length ===
                                  msg.aiSuggestionsList.length
                                    ? 'Batal Pilih Semua'
                                    : 'Pilih Semua (10 Saran)'}
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {msg.aiSuggestionsList.map((suggestionItem, sIdx) => {
                                const isChecked = (msg.selectedSuggestions || []).includes(
                                  suggestionItem
                                );
                                return (
                                  <button
                                    key={sIdx}
                                    type="button"
                                    onClick={() =>
                                      handleToggleSuggestionItem(msg.id, suggestionItem)
                                    }
                                    className={`text-left p-2.5 rounded-xl border text-xs flex items-start gap-2.5 transition-all cursor-pointer ${
                                      isChecked
                                        ? darkMode
                                          ? 'bg-[#004A77]/60 border-[#4285F4] text-[#E3E3E3]'
                                          : 'bg-[#D3E3FD]/65 border-[#0B57D0] text-[#041E49]'
                                        : `${bgSubCard} opacity-80 hover:opacity-100`
                                    }`}
                                  >
                                    <div
                                      className={`w-4 h-4 mt-0.5 rounded flex items-center justify-center shrink-0 border ${
                                        isChecked
                                          ? 'bg-[#0B57D0] border-[#0B57D0] text-white'
                                          : 'border-gray-400'
                                      }`}
                                    >
                                      {isChecked && <Check className="w-3 h-3" />}
                                    </div>
                                    <span className="leading-snug">
                                      <strong>{sIdx + 1}.</strong> {suggestionItem}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-2.5 pt-1">
                          <button
                            type="button"
                            onClick={() =>
                              handleMergeWithSuggestionAndProceed(
                                msg.interviewStep!,
                                msg.selectedSuggestions && msg.selectedSuggestions.length > 0
                                  ? msg.selectedSuggestions
                                  : msg.aiSuggestionsList || []
                              )
                            }
                            className="px-4 py-2 rounded-full text-xs font-semibold text-white bg-[#0B57D0] hover:bg-[#0842A0] flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Wand2 className="w-3.5 h-3.5" />
                            <span>
                              Gabungkan dengan Saran (
                              {(msg.selectedSuggestions || []).length ||
                                (msg.aiSuggestionsList || []).length}
                              )
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={handleProceedToNextStep}
                            className={`px-4 py-2 rounded-full text-xs font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                              darkMode
                                ? 'bg-[#282A2C] hover:bg-[#333537] text-[#E3E3E3] border-[#333537]'
                                : 'bg-[#D3E3FD] hover:bg-[#C2E7FF] text-[#041E49] border-transparent'
                            }`}
                          >
                            <span>Lanjutkan</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleReviseStepAnswer(msg.interviewStep!)}
                            className={`px-4 py-2 rounded-full text-xs font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer ${bgSubCard}`}
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-[#4285F4]" />
                            <span>Revisi</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* FINAL INTERVIEW SUMMARY ACTION BAR: [Revisi Jawaban] & [Buat PRD Sekarang] */}
                    {msg.isReadyToGenerateCard && (
                      <div className="pl-6 flex flex-wrap items-center gap-2.5 pt-2">
                        <button
                          type="button"
                          onClick={() => handleReviseStepAnswer(1)}
                          className={`px-4 py-2 rounded-full text-xs font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer ${bgSubCard}`}
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#4285F4]" />
                          <span>Revisi Jawaban</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleGenerateFinalPRDFromInterview}
                          disabled={isGenerating}
                          className="px-5 py-2.5 rounded-full text-xs font-semibold text-white bg-[#0B57D0] hover:bg-[#0842A0] disabled:opacity-50 flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Buat PRD Sekarang</span>
                        </button>
                      </div>
                    )}

                    {attachedDoc && (
                      <div className={`ml-0 sm:ml-6 border rounded-3xl p-5 sm:p-6 space-y-5 ${bgCard}`}>
                        <div
                          className={`flex flex-wrap items-start justify-between gap-4 pb-4 border-b ${
                            darkMode ? 'border-[#333537]' : 'border-[#E3E3E3]'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className={`text-xs font-mono ${textMuted}`}>
                              {attachedDoc.code} · {attachedDoc.version} · {attachedDoc.status}
                            </div>
                            <h2 className="font-display text-lg sm:text-xl font-bold">
                              {attachedDoc.title}
                            </h2>
                            <p className={`text-xs sm:text-sm leading-relaxed ${textMuted}`}>
                              {attachedDoc.summary}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => exportPRDToPDF(attachedDoc)}
                              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#0B57D0] hover:bg-[#0842A0] rounded-full flex items-center gap-1.5 cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>PDF</span>
                            </button>
                            <button
                              onClick={() => exportPRDToZipBundle(attachedDoc)}
                              className={`px-3.5 py-1.5 text-xs font-semibold rounded-full flex items-center gap-1.5 cursor-pointer ${
                                darkMode
                                  ? 'bg-[#282A2C] hover:bg-[#333537] text-[#E3E3E3]'
                                  : 'bg-[#D3E3FD] hover:bg-[#C2E7FF] text-[#041E49]'
                              }`}
                            >
                              <FolderArchive className="w-3.5 h-3.5" />
                              <span>ZIP</span>
                            </button>
                            <button
                              onClick={() => {
                                setActiveIntegrationTool('Google Stitch');
                                setActiveModal('integrations');
                              }}
                              className={`px-3.5 py-1.5 text-xs font-semibold border rounded-full flex items-center gap-1.5 cursor-pointer ${bgSubCard}`}
                            >
                              <Share2 className="w-3.5 h-3.5 text-[#4285F4]" />
                              <span>Prompt Semua AI · Stitch · Trello · Jira</span>
                            </button>
                            <button
                              onClick={() => setActiveModal('revisions')}
                              className={`px-3.5 py-1.5 text-xs font-semibold border rounded-full flex items-center gap-1.5 cursor-pointer ${bgSubCard}`}
                            >
                              <History className="w-3.5 h-3.5 text-[#4285F4]" />
                              <span>Revisi ({attachedDoc.revisions.length})</span>
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {attachedDoc.sections.map((sec) => (
                            <div
                              key={sec.id}
                              className={`border rounded-2xl p-4 space-y-1.5 ${bgSubCard}`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <h3 className="text-sm font-bold">
                                  {sec.number}. {sec.title}
                                </h3>
                                <button
                                  onClick={() => {
                                    setEditingSectionId(sec.id);
                                    setDraftTitle(sec.title);
                                    setDraftContent(sec.content);
                                    setDraftStatus(sec.status);
                                    setActiveModal('edit-prd');
                                  }}
                                  className="text-xs text-[#4285F4] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span>Edit</span>
                                </button>
                              </div>
                              <div className={`text-xs sm:text-sm whitespace-pre-line leading-relaxed ${textMuted}`}>
                                {sec.content}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {isGenerating && (
                <div className="flex items-center gap-3 text-sm text-[#4285F4] font-medium pl-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Menyusun dokumen PRD lengkap & Prompt Google Stitch Bahasa Indonesia...</span>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* BOTTOM GEMINI CHAT BAR */}
        <div className="px-4 sm:px-6 pb-6 pt-2 shrink-0">
          <div className="max-w-3xl mx-auto">
            <form
              onSubmit={(e) => handleSendPrompt(e)}
              className={`rounded-3xl px-4 py-3 border transition-all flex items-end gap-3 ${bgOmnibox}`}
            >
              <textarea
                ref={inputRef}
                rows={1}
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendPrompt();
                  }
                }}
                placeholder={currentQuestionPlaceholder}
                className="flex-1 py-1.5 text-sm bg-transparent focus:outline-none resize-none max-h-36"
              />

              <button
                type="submit"
                disabled={isGenerating || !promptInput.trim()}
                className="p-2.5 rounded-full bg-[#0B57D0] hover:bg-[#0842A0] disabled:opacity-40 text-white transition-colors cursor-pointer shrink-0"
                title="Kirim"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* MODALS */}
        {activeModal !== 'none' && currentDoc && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div
              className={`border rounded-3xl max-w-md w-full overflow-hidden shadow-xl ${
                activeModal !== 'ai-settings' ? 'max-w-3xl max-h-[85vh] flex flex-col' : 'max-w-lg'
              } ${
                darkMode
                  ? 'bg-[#1E1F20] border-[#333537] text-[#E3E3E3]'
                  : 'bg-white border-[#E3E3E3] text-[#1F1F1F]'
              }`}
            >
              <div
                className={`px-6 py-4 border-b flex items-center justify-between ${
                  darkMode ? 'border-[#333537]' : 'border-[#E3E3E3]'
                }`}
              >
                <span className="font-display text-base font-bold">
                  {activeModal === 'ai-settings' && 'Pengaturan AI Pribadi (9Router Combo & API Key Lain)'}
                  {activeModal === 'integrations' && 'Prompt AI Universal (Stitch · Cursor · v0 · Bolt · Claude) · Trello · Jira'}
                  {activeModal === 'revisions' && 'Riwayat Revisi Real-Time'}
                  {activeModal === 'collaboration' && 'Dasbor Kolaborasi Multi-Pengguna'}
                  {activeModal === 'edit-prd' && 'Edit Bab PRD'}
                </span>
                <button
                  onClick={() => setActiveModal('none')}
                  className="p-1.5 rounded-full hover:opacity-75 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                {/* AI SETTINGS MODAL: TAB 1 = 9ROUTER COMBO (UNTOUCHED), TAB 2 = OTHER AI API KEYS */}
                {activeModal === 'ai-settings' && (
                  <div className="space-y-4 text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAiSettingsTab('9router');
                          setOtherAiConfig((prev) => ({ ...prev, activeProvider: '9router' }));
                        }}
                        className={`flex-1 py-2 px-3 rounded-full font-semibold cursor-pointer ${
                          aiSettingsTab === '9router'
                            ? 'bg-[#0B57D0] text-white'
                            : bgSubCard
                        }`}
                      >
                        9Router Combo (Hermes Style)
                      </button>
                      <button
                        type="button"
                        onClick={() => setAiSettingsTab('other')}
                        className={`flex-1 py-2 px-3 rounded-full font-semibold cursor-pointer ${
                          aiSettingsTab === 'other'
                            ? 'bg-[#0B57D0] text-white'
                            : bgSubCard
                        }`}
                      >
                        API Key AI Lainnya
                      </button>
                    </div>

                    {aiSettingsTab === '9router' ? (
                      /* 9ROUTER CONFIG: PILIH SALAH SATU -> PAKAI COMBO (NAMA COMBO) ATAU TANPA COMBO (NAMA PROVIDER) */
                      <div className="space-y-4 pt-1">
                        <div>
                          <label className="block font-semibold mb-1.5">
                            Pilih Mode Penggunaan
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setComboConfig({ ...comboConfig, mode: 'combo' })
                              }
                              className={`py-2 px-3 rounded-xl border font-semibold text-xs cursor-pointer transition-colors ${
                                (comboConfig.mode || 'combo') === 'combo'
                                  ? 'bg-[#0B57D0] text-white border-[#0B57D0]'
                                  : bgSubCard
                              }`}
                            >
                              Gunakan Fitur Combo
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setComboConfig({
                                  ...comboConfig,
                                  mode: 'provider',
                                  providerName: comboConfig.providerName || 'gemini',
                                })
                              }
                              className={`py-2 px-3 rounded-xl border font-semibold text-xs cursor-pointer transition-colors ${
                                comboConfig.mode === 'provider'
                                  ? 'bg-[#0B57D0] text-white border-[#0B57D0]'
                                  : bgSubCard
                              }`}
                            >
                              Tanpa Combo (Provider Saja)
                            </button>
                          </div>
                        </div>

                        <p className={textMuted}>
                          {(comboConfig.mode || 'combo') === 'combo'
                            ? `Cukup masukkan API Key dan Nama Combo yang sudah Anda buat di 9Router (seperti menyambungkan ke Hermes).`
                            : `Tidak menggunakan Combo? Cukup masukkan API Key dan Nama Provider saja (contoh: gemini, claude, openai, deepseek, groq).`}
                        </p>

                        <div>
                          <label className="block font-semibold mb-1.5">
                            API Key
                          </label>
                          <div className="relative">
                            <input
                              type={showApiKeyEye ? 'text' : 'password'}
                              value={comboConfig.apiKey}
                              onChange={(e) =>
                                setComboConfig({ ...comboConfig, apiKey: e.target.value })
                              }
                              placeholder="Masukkan API Key (misal: sk-9router-...)"
                              className={`w-full pl-3.5 pr-10 py-2.5 rounded-xl border font-mono text-xs focus:outline-none focus:border-[#4285F4] ${bgSubCard}`}
                            />
                            <button
                              type="button"
                              onClick={() => setShowApiKeyEye(!showApiKeyEye)}
                              className={`absolute right-3 top-2.5 cursor-pointer ${textMuted}`}
                            >
                              {showApiKeyEye ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {(comboConfig.mode || 'combo') === 'combo' ? (
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="font-semibold">
                                Nama Combo
                              </label>
                              <button
                                type="button"
                                onClick={fetchAvailable9RouterCombos}
                                disabled={isFetchingCombos}
                                className="text-[11px] font-semibold text-[#4285F4] hover:underline cursor-pointer"
                              >
                                {isFetchingCombos ? 'Mendeteksi...' : 'Ambil Daftar Combo'}
                              </button>
                            </div>
                            <input
                              type="text"
                              value={comboConfig.comboName}
                              onChange={(e) =>
                                setComboConfig({ ...comboConfig, comboName: e.target.value })
                              }
                              placeholder="Masukkan nama combo (misal: my-combo / hermes)"
                              className={`w-full px-3.5 py-2.5 rounded-xl border font-mono text-xs focus:outline-none focus:border-[#4285F4] ${bgSubCard}`}
                            />
                            {detectedCombos.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {detectedCombos.map((cName) => (
                                  <button
                                    key={cName}
                                    type="button"
                                    onClick={() => setComboConfig({ ...comboConfig, comboName: cName })}
                                    className={`px-2.5 py-1 rounded-full text-[11px] font-mono border cursor-pointer ${
                                      comboConfig.comboName === cName
                                        ? 'bg-[#0B57D0] text-white border-[#0B57D0]'
                                        : bgSubCard
                                    }`}
                                  >
                                    {cName}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <label className="block font-semibold mb-1.5">
                              Nama Provider (Contoh: Gemini, Claude, OpenAI)
                            </label>
                            <input
                              type="text"
                              value={comboConfig.providerName || ''}
                              onChange={(e) =>
                                setComboConfig({ ...comboConfig, providerName: e.target.value })
                              }
                              placeholder="Ketik nama provider (contoh: gemini, claude, openai, deepseek)"
                              className={`w-full px-3.5 py-2.5 rounded-xl border font-mono text-xs focus:outline-none focus:border-[#4285F4] ${bgSubCard}`}
                            />
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {NINE_ROUTER_PROVIDER_PRESETS.map((pName) => (
                                <button
                                  key={pName}
                                  type="button"
                                  onClick={() =>
                                    setComboConfig({ ...comboConfig, providerName: pName })
                                  }
                                  className={`px-2.5 py-1 rounded-full text-[11px] font-mono border cursor-pointer ${
                                    (comboConfig.providerName || '').toLowerCase() === pName
                                      ? 'bg-[#0B57D0] text-white border-[#0B57D0]'
                                      : bgSubCard
                                  }`}
                                >
                                  {pName}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => setShowAdvancedEndpoint(!showAdvancedEndpoint)}
                            className={`text-[11px] hover:underline cursor-pointer ${textMuted}`}
                          >
                            {showAdvancedEndpoint
                              ? 'Sembunyikan pengaturan URL'
                              : `Endpoint default: ${comboConfig.baseUrl} (Ubah jika berbeda)`}
                          </button>

                          {showAdvancedEndpoint && (
                            <input
                              type="text"
                              value={comboConfig.baseUrl}
                              onChange={(e) =>
                                setComboConfig({ ...comboConfig, baseUrl: e.target.value })
                              }
                              placeholder="http://localhost:20128/v1"
                              className={`mt-2 w-full px-3 py-2 rounded-xl border font-mono text-xs ${bgSubCard}`}
                            />
                          )}
                        </div>
                      </div>
                    ) : (
                      /* UNIVERSAL AI API KEYS TAB — CUKUP MASUKKAN NAMA PROVIDER & API KEY */
                      <div className="space-y-4 pt-1">
                        <p className={textMuted}>
                          Tidak menggunakan fitur Combo? Cukup masukkan/pilih **Nama Provider** (seperti **Gemini**, **Claude**, **OpenAI**, **DeepSeek**, **Groq**) dan **API Key** Anda.
                        </p>

                        <div>
                          <label className="block font-semibold mb-1.5">
                            Nama Provider AI (Contoh: Gemini, Claude, OpenAI)
                          </label>
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {[
                              { id: 'gemini', label: 'Gemini' },
                              { id: 'anthropic', label: 'Claude' },
                              { id: 'openai', label: 'OpenAI' },
                              { id: 'deepseek', label: 'DeepSeek' },
                              { id: 'groq', label: 'Groq' },
                              { id: 'openrouter', label: 'OpenRouter' },
                              { id: 'mistral', label: 'Mistral' },
                              { id: 'xai', label: 'xAI Grok' },
                              { id: 'perplexity', label: 'Perplexity' },
                            ].map((pItem) => (
                              <button
                                key={pItem.id}
                                type="button"
                                onClick={() =>
                                  setOtherAiConfig({
                                    ...otherAiConfig,
                                    activeProvider: pItem.id,
                                  })
                                }
                                className={`px-3 py-1 rounded-full text-xs font-semibold border cursor-pointer ${
                                  otherAiConfig.activeProvider === pItem.id
                                    ? 'bg-[#0B57D0] text-white border-[#0B57D0]'
                                    : bgSubCard
                                }`}
                              >
                                {pItem.label}
                              </button>
                            ))}
                          </div>
                          <select
                            value={
                              otherAiConfig.activeProvider === '9router'
                                ? 'gemini'
                                : otherAiConfig.activeProvider
                            }
                            onChange={(e) =>
                              setOtherAiConfig({
                                ...otherAiConfig,
                                activeProvider: e.target.value,
                              })
                            }
                            className={`w-full px-3.5 py-2.5 rounded-xl border text-xs ${bgSubCard}`}
                          >
                            {UNIVERSAL_AI_PROVIDERS.filter((p) => p.id !== '9router').map((prov) => (
                              <option key={prov.id} value={prov.id}>
                                {prov.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {(() => {
                          const activeId =
                            otherAiConfig.activeProvider === '9router'
                              ? 'gemini'
                              : otherAiConfig.activeProvider;
                          const selectedProv =
                            UNIVERSAL_AI_PROVIDERS.find((p) => p.id === activeId) ||
                            UNIVERSAL_AI_PROVIDERS[1];
                          const currentCred = getCurrentProviderEntry(selectedProv.id);

                          return (
                            <div className="space-y-3">
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <label className="font-semibold">
                                    API Key ({selectedProv.name.split('(')[0].trim()})
                                  </label>
                                  <span className="text-[11px] text-[#4285F4] font-medium">
                                    Cukup Provider & API Key
                                  </span>
                                </div>
                                <div className="relative">
                                  <input
                                    type={showApiKeyEye ? 'text' : 'password'}
                                    value={currentCred.apiKey}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      const autoDetected = detectProviderFromApiKey(val);
                                      if (autoDetected && autoDetected.id !== selectedProv.id) {
                                        setOtherAiConfig((prev) => ({
                                          ...prev,
                                          activeProvider: autoDetected.id,
                                          providerKeys: {
                                            ...(prev.providerKeys || {}),
                                            [autoDetected.id]: {
                                              apiKey: val,
                                              model: autoDetected.defaultModel,
                                              baseUrl: autoDetected.baseUrl,
                                            },
                                          },
                                        }));
                                      } else {
                                        if (otherAiConfig.activeProvider === '9router') {
                                          setOtherAiConfig((prev) => ({
                                            ...prev,
                                            activeProvider: selectedProv.id,
                                          }));
                                        }
                                        updateCurrentProviderEntry(selectedProv.id, {
                                          apiKey: val,
                                        });
                                      }
                                    }}
                                    placeholder="Tempel API Key Anda di sini..."
                                    className={`w-full pl-3.5 pr-10 py-2.5 rounded-xl border font-mono ${bgSubCard}`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowApiKeyEye(!showApiKeyEye)}
                                    className={`absolute right-3 top-2.5 cursor-pointer ${textMuted}`}
                                    title={showApiKeyEye ? 'Sembunyikan API Key' : 'Lihat API Key'}
                                  >
                                    {showApiKeyEye ? (
                                      <EyeOff className="w-4 h-4" />
                                    ) : (
                                      <Eye className="w-4 h-4" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={handleSaveUserAiSettings}
                        className="w-full py-2.5 text-xs font-semibold text-white bg-[#0B57D0] hover:bg-[#0842A0] rounded-full cursor-pointer"
                      >
                        Simpan Pengaturan AI ke Akun Saya
                      </button>
                    </div>
                  </div>
                )}

                {activeModal === 'edit-prd' && (
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      className={`w-full px-3.5 py-2 text-sm border rounded-xl ${bgSubCard}`}
                    />
                    <textarea
                      rows={9}
                      value={draftContent}
                      onChange={(e) => setDraftContent(e.target.value)}
                      className={`w-full p-3.5 text-sm leading-relaxed border rounded-2xl ${bgSubCard}`}
                    />
                    <input
                      type="text"
                      value={changeNote}
                      onChange={(e) => setChangeNote(e.target.value)}
                      placeholder="Catatan revisi..."
                      className={`w-full px-3.5 py-2 text-xs border rounded-xl ${bgSubCard}`}
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={handleSaveManualEdit}
                        className="px-5 py-2 text-xs font-semibold text-white bg-[#0B57D0] rounded-full cursor-pointer"
                      >
                        Simpan Revisi
                      </button>
                    </div>
                  </div>
                )}

                {activeModal === 'integrations' && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {(['Google Stitch', 'Prompt AI Lainnya', 'Trello', 'Jira'] as const).map((tool) => (
                        <button
                          key={tool}
                          onClick={() => setActiveIntegrationTool(tool)}
                          className={`px-4 py-1.5 text-xs font-semibold rounded-full cursor-pointer transition-colors ${
                            activeIntegrationTool === tool
                              ? 'bg-[#0B57D0] text-white'
                              : bgSubCard
                          }`}
                        >
                          {tool}
                        </button>
                      ))}
                    </div>

                    {activeIntegrationTool === 'Google Stitch' && (
                      <div className="space-y-3">
                        <div className="flex flex-wrap justify-between items-center gap-2">
                          <span className={`text-xs ${textMuted}`}>
                            Prompt Desain UI Google Stitch (100% Bahasa Indonesia — Siap Tempel ke Stitch)
                          </span>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(currentDoc.stitchPromptSpec);
                                setCopiedStitchPrompt(true);
                                setTimeout(() => setCopiedStitchPrompt(false), 2000);
                              }}
                              className={`px-3.5 py-1.5 text-xs font-semibold border rounded-full flex items-center gap-1.5 cursor-pointer ${bgSubCard}`}
                            >
                              {copiedStitchPrompt ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copiedStitchPrompt ? 'Tersalin' : 'Salin Prompt Stitch'}</span>
                            </button>
                            <button
                              onClick={() => handleSyncIntegration('Google Stitch')}
                              disabled={isSyncingIntegration}
                              className="px-4 py-1.5 text-xs font-semibold text-white bg-[#0B57D0] rounded-full cursor-pointer"
                            >
                              Sinkronkan ke Stitch
                            </button>
                          </div>
                        </div>
                        <textarea
                          rows={9}
                          value={currentDoc.stitchPromptSpec}
                          onChange={(e) => {
                            const updated = { ...currentDoc, stitchPromptSpec: e.target.value };
                            setDocuments((prev) => prev.map((d) => (d.id === currentDoc.id ? updated : d)));
                          }}
                          className={`w-full p-3.5 text-xs font-mono border rounded-2xl ${bgSubCard}`}
                        />
                      </div>
                    )}

                    {activeIntegrationTool === 'Prompt AI Lainnya' && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-semibold mb-1.5">
                            Pilih Target AI Tujuan (Siap Tempel ke AI Mana Saja):
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {PROMPT_EXPORT_TARGETS.filter((t) => t.id !== 'stitch').map((target) => (
                              <button
                                key={target.id}
                                type="button"
                                onClick={() => setPromptExportTarget(target.id)}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold border cursor-pointer transition-colors ${
                                  promptExportTarget === target.id
                                    ? 'bg-[#0B57D0] text-white border-[#0B57D0]'
                                    : bgSubCard
                                }`}
                              >
                                {target.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {(() => {
                          const selectedTargetMeta =
                            PROMPT_EXPORT_TARGETS.find((t) => t.id === promptExportTarget) ||
                            PROMPT_EXPORT_TARGETS[1];
                          const promptContent = buildPromptForAnyAI(currentDoc, promptExportTarget);

                          return (
                            <>
                              <div className="flex flex-wrap justify-between items-center gap-2 pt-1">
                                <span className={`text-xs ${textMuted}`}>
                                  {selectedTargetMeta.desc}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(promptContent);
                                    setCopiedStitchPrompt(true);
                                    triggerToast(`Prompt untuk ${selectedTargetMeta.label} berhasil disalin!`);
                                    setTimeout(() => setCopiedStitchPrompt(false), 2000);
                                  }}
                                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#0B57D0] hover:bg-[#0842A0] rounded-full flex items-center gap-1.5 cursor-pointer"
                                >
                                  {copiedStitchPrompt ? (
                                    <Check className="w-3.5 h-3.5" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                  <span>
                                    {copiedStitchPrompt
                                      ? 'Tersalin!'
                                      : `Salin Prompt (${selectedTargetMeta.label})`}
                                  </span>
                                </button>
                              </div>

                              <textarea
                                rows={10}
                                value={promptContent}
                                onChange={(e) => {
                                  const overrideKey = `${currentDoc.id}_${promptExportTarget}`;
                                  setCustomAiPromptOverrides((prev) => ({
                                    ...prev,
                                    [overrideKey]: e.target.value,
                                  }));
                                }}
                                className={`w-full p-3.5 text-xs font-mono border rounded-2xl ${bgSubCard}`}
                              />
                            </>
                          );
                        })()}
                      </div>
                    )}

                    {activeIntegrationTool === 'Trello' && (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className={`text-xs ${textMuted}`}>
                            Ekspor {currentDoc.userStories.length} User Stories ke Trello
                          </span>
                          <button
                            onClick={() => handleSyncIntegration('Trello')}
                            disabled={isSyncingIntegration}
                            className="px-4 py-1.5 text-xs font-semibold text-white bg-[#0B57D0] rounded-full cursor-pointer"
                          >
                            Dorong ke Trello
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={trelloApiKey}
                            onChange={(e) => setTrelloApiKey(e.target.value)}
                            placeholder="Trello API Key (Opsional)"
                            className={`px-3 py-2 text-xs border rounded-xl font-mono ${bgSubCard}`}
                          />
                          <input
                            type="password"
                            value={trelloToken}
                            onChange={(e) => setTrelloToken(e.target.value)}
                            placeholder="Trello Token (Opsional)"
                            className={`px-3 py-2 text-xs border rounded-xl font-mono ${bgSubCard}`}
                          />
                          <input
                            type="text"
                            value={trelloListId}
                            onChange={(e) => setTrelloListId(e.target.value)}
                            placeholder="Trello List ID"
                            className={`px-3 py-2 text-xs border rounded-xl font-mono ${bgSubCard}`}
                          />
                        </div>
                      </div>
                    )}

                    {activeIntegrationTool === 'Jira' && (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className={`text-xs ${textMuted}`}>
                            Sinkronkan Epic & {currentDoc.userStories.length} Stories ({totalStoryPoints} SP) ke Jira
                          </span>
                          <button
                            onClick={() => handleSyncIntegration('Jira')}
                            disabled={isSyncingIntegration}
                            className="px-4 py-1.5 text-xs font-semibold text-white bg-[#0B57D0] rounded-full cursor-pointer"
                          >
                            Sinkronkan ke Jira
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={jiraDomain}
                            onChange={(e) => setJiraDomain(e.target.value)}
                            placeholder="domain.atlassian.net"
                            className={`px-3 py-2 text-xs border rounded-xl font-mono ${bgSubCard}`}
                          />
                          <input
                            type="text"
                            value={jiraProjectKey}
                            onChange={(e) => setJiraProjectKey(e.target.value)}
                            placeholder="Project Key (FIN)"
                            className={`px-3 py-2 text-xs border rounded-xl font-mono ${bgSubCard}`}
                          />
                          <input
                            type="email"
                            value={jiraEmail}
                            onChange={(e) => setJiraEmail(e.target.value)}
                            placeholder="Email Jira (Opsional)"
                            className={`px-3 py-2 text-xs border rounded-xl ${bgSubCard}`}
                          />
                          <input
                            type="password"
                            value={jiraApiToken}
                            onChange={(e) => setJiraApiToken(e.target.value)}
                            placeholder="Jira API Token (Opsional)"
                            className={`px-3 py-2 text-xs border rounded-xl font-mono ${bgSubCard}`}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeModal === 'revisions' && (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-5 space-y-2">
                      {currentDoc.revisions.map((rev) => (
                        <button
                          key={rev.id}
                          onClick={() => setSelectedRevisionId(rev.id)}
                          className={`w-full text-left p-3 rounded-2xl border text-xs cursor-pointer ${
                            rev.id === activeRevision?.id
                              ? 'border-[#4285F4]'
                              : bgSubCard
                          }`}
                        >
                          <div className="flex justify-between font-mono">
                            <strong className="text-[#4285F4]">{rev.version}</strong>
                            <span className={textMuted}>{rev.timestamp}</span>
                          </div>
                          <div className="font-semibold mt-1">{rev.sectionTitle}</div>
                          <div className={`${textMuted} mt-0.5`}>{rev.changeSummary}</div>
                        </button>
                      ))}
                    </div>

                    {activeRevision && (
                      <div className={`md:col-span-7 border rounded-2xl p-4 space-y-3 ${bgSubCard}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold">
                            Versi {activeRevision.version}
                          </span>
                          {activeRevision.sectionId !== 'all' && (
                            <button
                              onClick={() => handleRestoreRevision(activeRevision.id)}
                              className="px-3 py-1 text-xs font-semibold bg-[#0B57D0] text-white rounded-full cursor-pointer"
                            >
                              Pulihkan Versi Ini
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div className={`p-3 rounded-xl border ${bgCard}`}>
                            <div className="font-semibold text-red-500 mb-1">Sebelum</div>
                            <div className="whitespace-pre-line">{activeRevision.previousContent}</div>
                          </div>
                          <div className={`p-3 rounded-xl border ${bgCard}`}>
                            <div className="font-semibold text-emerald-500 mb-1">Sesudah</div>
                            <div className="whitespace-pre-line">{activeRevision.newContent}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeModal === 'collaboration' && (
                  <div className="space-y-4 text-xs">
                    <div className="grid grid-cols-3 gap-3">
                      <div className={`p-3.5 rounded-2xl border ${bgSubCard}`}>
                        <div className={textMuted}>Versi Aktif</div>
                        <div className="text-base font-bold font-mono mt-0.5">{currentDoc.version}</div>
                      </div>
                      <div className={`p-3.5 rounded-2xl border ${bgSubCard}`}>
                        <div className={textMuted}>Story Points</div>
                        <div className="text-base font-bold font-mono mt-0.5">
                          {completedStoryPoints} / {totalStoryPoints} SP
                        </div>
                      </div>
                      <div className={`p-3.5 rounded-2xl border ${bgSubCard}`}>
                        <div className={textMuted}>Total Revisi</div>
                        <div className="text-base font-bold font-mono mt-0.5">
                          {currentDoc.revisions.length}
                        </div>
                      </div>
                    </div>

                    <div className="divide-y divide-[#E3E3E3]/30">
                      <div className="py-3 flex items-center justify-between">
                        <div>
                          <div className="font-semibold">{authUser.name} (Anda)</div>
                          <div className={textMuted}>{authUser.email} · {authUser.role}</div>
                        </div>
                        <span className="text-emerald-500 font-semibold">Online</span>
                      </div>
                      {collaborators
                        .filter((c) => c.name !== authUser.name)
                        .map((member) => (
                          <div key={member.clientId} className="py-3 flex items-center justify-between">
                            <div>
                              <div className="font-semibold">{member.name}</div>
                              <div className={textMuted}>{member.role}</div>
                            </div>
                            <span className="text-emerald-500 font-semibold">Online</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
