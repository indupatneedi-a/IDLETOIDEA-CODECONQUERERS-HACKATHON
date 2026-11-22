import React, { useState, useEffect, useCallback } from 'react';
import { Film, ArrowRight } from 'lucide-react';

interface CinematicIntroProps {
  onEnter: () => void;
}

export const CinematicIntro: React.FC<CinematicIntroProps> = ({ onEnter }) => {
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const [counter, setCounter] = useState(prefersReducedMotion ? 100 : 0);
  const [isFading, setIsFading] = useState(false);
  const [pulsePhase, setPulsePhase] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const timer = setInterval(() => {
      setCounter((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        const jump = Math.floor(Math.random() * 8) + 4;
        return Math.min(100, prev + jump);
      });
    }, 45);
    return () => clearInterval(timer);
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const pulseTimer = setInterval(() => {
      setPulsePhase((prev) => (prev + 1) % 4);
    }, 450);
    return () => clearInterval(pulseTimer);
  }, [prefersReducedMotion]);

  const handleEnter = useCallback(() => {
    if (isFading) return;
    if (prefersReducedMotion) {
      onEnter();
      return;
    }
    setIsFading(true);
    setTimeout(() => {
      onEnter();
    }, 400);
  }, [isFading, onEnter, prefersReducedMotion]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        handleEnter();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleEnter]);

  const line1 = [
    { char: 'I', fill: prefersReducedMotion || pulsePhase % 2 === 0 },
    { char: 'D', fill: prefersReducedMotion || pulsePhase % 3 !== 0 },
    { char: 'L', fill: prefersReducedMotion || pulsePhase % 2 !== 0 },
    { char: 'E', fill: true },
    { char: 'T', fill: prefersReducedMotion || pulsePhase % 2 === 0 },
    { char: 'O', fill: prefersReducedMotion || pulsePhase % 3 === 0, pink: true },
  ];

  const line2 = [
    { char: 'I', fill: true },
    { char: 'D', fill: prefersReducedMotion || pulsePhase % 2 !== 0 },
    { char: 'E', fill: prefersReducedMotion || pulsePhase % 2 === 0 },
    { char: 'A', fill: true, pink: true },
  ];

  return (
    <div
      onClick={handleEnter}
      role="dialog"
      aria-label="IDLETOIDEA Welcome Intro"
      className={`fixed inset-0 z-50 flex flex-col justify-between p-6 sm:p-12 cursor-pointer select-none transition-opacity duration-400 bg-[#0D0D0F] overflow-hidden ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        backgroundImage:
          'radial-gradient(circle at 50% 48%, rgba(122, 31, 61, 0.34) 0%, rgba(23, 23, 27, 0.88) 55%, rgba(13, 13, 15, 0.99) 100%)',
      }}
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between text-xs tracking-widest font-mono-code uppercase border-b border-[#2C2A2F] pb-4">
        <div className="flex items-center gap-2.5 text-[#F4A6C0]">
          <Film className="w-4 h-4 text-[#F4A6C0]" />
          <span>IDLETOIDEA // MAKERSPACE ACCESS</span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleEnter();
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#17171B] hover:bg-[#7A1F3D] border border-[#2C2A2F] hover:border-[#F4A6C0] text-[#F5F1F2] text-xs font-semibold tracking-wider uppercase transition-colors cursor-pointer"
        >
          <span>Skip</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#F4A6C0]" />
        </button>
      </div>

      {/* Centerpiece */}
      <div className="my-auto max-w-5xl mx-auto w-full text-center py-6 flex flex-col items-center justify-center">
        <p className="text-xs sm:text-sm font-mono-code tracking-[0.28em] uppercase text-[#F4A6C0] mb-4">
          Shared Equipment &amp; Workspaces
        </p>

        <div
          className="flex items-center justify-center font-kinetic font-black text-6xl sm:text-8xl md:text-9xl lg:text-[10.5rem] leading-[0.88] tracking-tight sm:tracking-normal"
          aria-label="IDLETOIDEA"
        >
          {line1.map((item, idx) => (
            <span
              key={idx}
              className={`transition-colors duration-300 inline-block ${
                item.fill
                  ? item.pink
                    ? 'text-[#F4A6C0]'
                    : 'text-[#7A1F3D]'
                  : item.pink
                  ? 'text-stroke-pink'
                  : 'text-stroke-maroon'
              }`}
            >
              {item.char}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-center font-kinetic font-black text-6xl sm:text-8xl md:text-9xl lg:text-[10.5rem] leading-[0.88] tracking-tight sm:tracking-normal">
          {line2.map((item, idx) => (
            <span
              key={idx}
              className={`transition-colors duration-300 inline-block ${
                item.fill
                  ? item.pink
                    ? 'text-[#F4A6C0]'
                    : 'text-[#7A1F3D]'
                  : item.pink
                  ? 'text-stroke-pink'
                  : 'text-stroke-maroon'
              }`}
            >
              {item.char}
            </span>
          ))}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleEnter();
          }}
          className="mt-8 sm:mt-10 inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-[#7A1F3D] hover:bg-[#93294B] text-[#F5F1F2] text-xs font-mono-code font-semibold tracking-widest uppercase border border-[#F4A6C0]/40 shadow-lg transition-colors cursor-pointer"
        >
          <span>Enter Platform</span>
          <ArrowRight className="w-4 h-4 text-[#F4A6C0]" />
        </button>
      </div>

      {/* Bottom Strip */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between border-t border-[#2C2A2F] pt-4 gap-4">
        <div className="flex items-baseline gap-3">
          <span className="font-mono-code text-3xl sm:text-4xl font-black text-[#F4A6C0] tracking-tight">
            {counter.toString().padStart(2, '0')}
          </span>
          <div className="text-[11px] font-mono-code tracking-widest uppercase text-[#B8AEB2]">
            <div>WORKSHOP ACCESS</div>
            <div className="text-[#F5F1F2]">
              {counter < 100 ? 'LOADING...' : 'READY'}
            </div>
          </div>
        </div>

        <div className="text-left sm:text-right max-w-md">
          <p className="text-xs font-mono-code tracking-[0.16em] text-[#B8AEB2] uppercase leading-relaxed">
            Discover equipment, verify safety readiness, and book shared creative spaces.
          </p>
        </div>
      </div>
    </div>
  );
};
