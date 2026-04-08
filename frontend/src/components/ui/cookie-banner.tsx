'use client';

import { useState, useEffect } from 'react';

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      // Small delay so the animation is visible
      const timer = setTimeout(() => setVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  function handleAccept() {
    localStorage.setItem('cookie-consent', 'accepted');
    setVisible(false);
  }

  function handleReject() {
    localStorage.setItem('cookie-consent', 'rejected');
    setVisible(false);
  }

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 p-4 transition-all duration-500 ease-out ${
        visible
          ? 'translate-y-0 opacity-100'
          : 'translate-y-full opacity-0 pointer-events-none'
      }`}
    >
      <div className="mx-auto max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900/95 backdrop-blur-sm p-5 shadow-2xl shadow-black/40">
        <p className="text-sm text-zinc-300 leading-relaxed mb-4">
          Мы используем cookie для улучшения работы сайта и аналитики.
        </p>
        <div className="flex items-center gap-3 justify-end">
          <button
            onClick={handleReject}
            className="rounded-lg border border-zinc-700 bg-transparent px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-100 cursor-pointer"
          >
            Отклонить
          </button>
          <button
            onClick={handleAccept}
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-400 cursor-pointer"
          >
            Принять
          </button>
        </div>
      </div>
    </div>
  );
}
