import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-zinc-950 overflow-hidden">
      {/* Gradient blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 left-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/3 h-[400px] w-[400px] translate-x-1/2 translate-y-1/2 rounded-full bg-purple-600/10 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/5 blur-[80px]" />
      </div>

      {/* Logo */}
      <div className="relative z-10 mb-16">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://voxi.kz/logo-full.svg"
          alt="VOXI"
          width={140}
          height={42}
          className="opacity-60"
        />
      </div>

      {/* 404 number with orbiting dots */}
      <div className="relative z-10 mb-8">
        {/* Orbiting dots */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-[220px] w-[220px] animate-[spin_12s_linear_infinite]">
            <div className="absolute top-0 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-indigo-400/60" />
            <div className="absolute bottom-0 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-purple-400/40" />
          </div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-[280px] w-[280px] animate-[spin_18s_linear_infinite_reverse]">
            <div className="absolute top-0 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-purple-400/50" />
            <div className="absolute right-0 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-indigo-300/30" />
            <div className="absolute bottom-4 left-4 h-1.5 w-1.5 rounded-full bg-indigo-400/40" />
          </div>
        </div>

        {/* The 404 text */}
        <h1
          className="relative text-[140px] font-extrabold leading-none tracking-tighter animate-float select-none"
          style={{
            background: 'linear-gradient(135deg, #818cf8, #a78bfa, #c084fc)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          404
        </h1>
      </div>

      {/* Text */}
      <h2 className="relative z-10 mb-3 text-2xl font-semibold text-zinc-100">
        Страница не найдена
      </h2>
      <p className="relative z-10 mb-10 max-w-sm text-center text-sm leading-relaxed text-zinc-500">
        Возможно, страница была перемещена или удалена.
      </p>

      {/* Button */}
      <Link
        href="/"
        className="relative z-10 inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-indigo-400 hover:shadow-lg hover:shadow-indigo-500/25"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        На главную
      </Link>

      {/* Inline keyframes for the float animation */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
