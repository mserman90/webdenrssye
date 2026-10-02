import React, { useState } from 'react';
import { Download, Smartphone, X, Share2, Check } from 'lucide-react';
import { usePWAInstall } from './usePWAInstall.ts';

interface PWAInstallProps {
  lang: 'tr' | 'en';
}

export const PWAInstallButton: React.FC<PWAInstallProps> = ({ lang }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed or running standalone, suppress
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 transition shadow-sm active:scale-95 shrink-0"
        title={lang === 'tr' ? 'Uygulamayı Cihazınıza Yükleyin' : 'Install PWA Application'}
      >
        <Smartphone className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{lang === 'tr' ? 'Uygulamayı Yükle' : 'Install App'}</span>
        <span className="sm:hidden">{lang === 'tr' ? 'Yükle' : 'Install'}</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-amber-400 border border-neutral-700/80 transition active:scale-95 shrink-0"
          title={lang === 'tr' ? "iPhone / iPad'e Yükle" : 'Install on iOS'}
        >
          <Share2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{lang === 'tr' ? 'Ana Ekrana Ekle' : 'Add to Home'}</span>
          <span className="sm:hidden">PWA</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm rounded-2xl bg-neutral-900 border border-neutral-800 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-sm text-white">
                    {lang === 'tr' ? "iPhone / iPad'e Yükleme" : 'Install on iPhone / iPad'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs text-neutral-300 space-y-3 bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    {lang === 'tr'
                      ? 'Safari alt çubuğundaki Paylaş (Share) butonuna dokunun.'
                      : 'Tap the Share icon in the Safari toolbar.'}
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    {lang === 'tr'
                      ? 'Menüyü aşağı kaydırıp "Ana Ekrana Ekle" (Add to Home Screen) seçeneğine tıklayın.'
                      : 'Scroll down and tap "Add to Home Screen".'}
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    3
                  </span>
                  <span>
                    {lang === 'tr'
                      ? 'Sağ üstteki "Ekle" butonuna basarak doğrudan uygulama gibi kullanın.'
                      : 'Tap "Add" in the top-right corner to launch like a native app.'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition"
              >
                {lang === 'tr' ? 'Anladım' : 'Got it'}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
