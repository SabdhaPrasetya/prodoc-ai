import React, { useState } from 'react';
import { Download, Smartphone, Monitor, X, CheckCircle2, WifiOff } from 'lucide-react';
import { usePWAInstall, useOnlineStatus } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  darkMode: boolean;
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ darkMode, compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  // If already running as a standalone installed app on HP/Laptop, hide the install button
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        className={`px-2.5 sm:px-3.5 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
          darkMode
            ? 'bg-[#004A77] hover:bg-[#005B94] text-[#C2E7FF]'
            : 'bg-[#0B57D0] hover:bg-[#0842A0] text-white'
        }`}
        title="Unduh & Pasang Aplikasi Nexus PRD di HP atau Laptop Anda"
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden sm:inline">
          {compact ? 'Unduh Aplikasi' : 'Unduh Aplikasi (HP & Laptop)'}
        </span>
        <span className="sm:hidden">Unduh</span>
      </button>

      {showGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md rounded-3xl border p-6 shadow-xl space-y-4 ${
              darkMode
                ? 'bg-[#1E1F20] border-[#333537] text-[#E3E3E3]'
                : 'bg-white border-[#E3E3E3] text-[#1F1F1F]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-[#4285F4]" />
                <h3 className="font-display text-base font-bold">
                  Pasang Nexus PRD di HP & Laptop
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-1.5 rounded-full hover:opacity-75 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className={`text-xs leading-relaxed ${darkMode ? 'text-[#C4C7C5]' : 'text-[#444746]'}`}>
              Aplikasi <strong>Nexus PRD</strong> sudah mendukung teknologi <strong>Progressive Web App (PWA)</strong> sehingga dapat diunduh dan dijalankan penuh seperti aplikasi asli di HP maupun Laptop Anda.
            </p>

            {isInstallable && (
              <button
                type="button"
                onClick={async () => {
                  const ok = await install();
                  if (ok) setShowGuideModal(false);
                }}
                className="w-full py-2.5 rounded-full bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Pasang Otomatis Sekarang</span>
              </button>
            )}

            <div className="space-y-3 text-xs">
              <div
                className={`p-3.5 rounded-2xl border space-y-1.5 ${
                  darkMode ? 'bg-[#131314] border-[#333537]' : 'bg-[#F8FAFD] border-[#E3E3E3]'
                }`}
              >
                <div className="font-semibold flex items-center gap-2 text-[#4285F4]">
                  <Monitor className="w-4 h-4 shrink-0" />
                  <span>Di Laptop / PC (Chrome, Edge, Brave)</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 pl-0.5 leading-relaxed">
                  <li>
                    Buka web ini di tab browser utama (klik tombol <strong>Buka di Tab Baru</strong> di pojok kanan atas jika Anda sedang membuka dari dalam jendela pratinjau).
                  </li>
                  <li>
                    Klik ikon <strong>Unduh / Pasang Nexus PRD</strong> di sebelah kanan kolom alamat URL browser, lalu pilih <strong>Instal (Install)</strong>.
                  </li>
                </ol>
              </div>

              <div
                className={`p-3.5 rounded-2xl border space-y-1.5 ${
                  darkMode ? 'bg-[#131314] border-[#333537]' : 'bg-[#F8FAFD] border-[#E3E3E3]'
                }`}
              >
                <div className="font-semibold flex items-center gap-2 text-[#4285F4]">
                  <Smartphone className="w-4 h-4 shrink-0" />
                  <span>
                    {isIOS
                      ? 'Di iPhone / iPad (Safari iOS)'
                      : 'Di HP Android & iPhone (Chrome / Safari)'}
                  </span>
                </div>
                <ol className="list-decimal list-inside space-y-1 pl-0.5 leading-relaxed">
                  <li>
                    <strong>Android (Chrome):</strong> Ketuk menu titik tiga <strong>(⋮)</strong> di pojok kanan atas lalu pilih <strong>Instal aplikasi (Install app)</strong> atau <strong>Tambahkan ke layar utama</strong>.
                  </li>
                  <li>
                    <strong>iPhone / iPad (Safari):</strong> Ketuk tombol <strong>Bagikan (Share)</strong> di bilah bawah Safari lalu pilih <strong>Tambahkan ke Layar Utama (Add to Home Screen)</strong>.
                  </li>
                </ol>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full py-2.5 rounded-full bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold cursor-pointer"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-full bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg">
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>Mode Offline — Menggunakan data lokal tersimpan</span>
    </div>
  );
};
