import { useRef, useState, useCallback } from 'react';
import { useTheme } from '@/context/theme';
import { motion, useSpring, useMotionValue } from 'framer-motion';
import {
  Sun, Moon, Sparkles, BookOpen, CalendarDays, Briefcase, Bell,
  Github,
} from 'lucide-react';
import LoginCard from '@/components/LoginCard';

/* ── Constellation geometry ── */
const VW = 560;
const VH = 420;
const CX = VW / 2;
const CY = 250;
const RADIUS = 170;
const MAGNETIC_THRESHOLD = 130;
const MAGNETIC_STRENGTH = 0.2;

const features = [
  { icon: Sparkles,     label: 'Better UI',   desc: 'Modern design', angle: -72, iconColor: 'text-warning',  accent: '#E2B866', color1: '#E2B866', color2: '#7B9AC4' },
  { icon: BookOpen,     label: 'Gandalf',     desc: 'Projects',      angle: -36, iconColor: 'text-primary',  accent: '#7B9AC4', color1: '#7B9AC4', color2: '#A8BDD8' },
  { icon: CalendarDays, label: 'Panoramix',   desc: 'Planning',      angle:   0, iconColor: 'text-success',  accent: '#8BBF9F', color1: '#8BBF9F', color2: '#7B9AC4' },
  { icon: Briefcase,    label: 'Alternance',  desc: 'Work calendar', angle:  36, iconColor: 'text-accent',   accent: '#A8BDD8', color1: '#A8BDD8', color2: '#8BBF9F' },
  { icon: Bell,         label: 'Alerts',      desc: 'Mobile push',   angle:  72, iconColor: 'text-danger',   accent: '#CD7B72', color1: '#CD7B72', color2: '#7B9AC4' },
] as const;

const cards = features.map((f) => {
  const rad = (f.angle * Math.PI) / 180;
  return { ...f, x: CX + Math.sin(rad) * RADIUS, y: CY - Math.cos(rad) * RADIUS };
});

function ribbonPath(cx: number, cy: number) {
  const dx = CX - cx;
  const dy = CY - cy;
  const mx = (cx + CX) / 2 - dy * 0.25;
  const my = (cy + CY) / 2 + dx * 0.25;
  return `M ${cx} ${cy} Q ${mx} ${my} ${CX} ${CY}`;
}

/* ── Magnetic + Glass card ── */
function MagneticCard({ card, index, mouseX, mouseY }: {
  card: typeof cards[number];
  index: number;
  mouseX: number;
  mouseY: number;
}) {
  const dx = mouseX - card.x;
  const dy = mouseY - card.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const inRange = dist < MAGNETIC_THRESHOLD && dist > 0;

  const offsetX = inRange ? dx * MAGNETIC_STRENGTH : 0;
  const offsetY = inRange ? dy * MAGNETIC_STRENGTH : 0;
  const scale = inRange ? 1 + (1 - dist / MAGNETIC_THRESHOLD) * 0.06 : 1;

  const springX = useSpring(useMotionValue(offsetX), { stiffness: 200, damping: 20 });
  const springY = useSpring(useMotionValue(offsetY), { stiffness: 200, damping: 20 });
  const springScale = useSpring(useMotionValue(scale), { stiffness: 300, damping: 25 });

  springX.set(offsetX);
  springY.set(offsetY);
  springScale.set(scale);

  const Icon = card.icon;

  return (
    <motion.div
      className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
      style={{ left: card.x, top: card.y, x: springX, y: springY, scale: springScale }}
    >
      <div style={{ animation: `landing-float 4s ease-in-out infinite ${index * 0.6}s` }}>
        <div
          className="bg-surface/85 dark:bg-surface-dark-dim/80 backdrop-blur-xl border border-border/60 dark:border-border-dark/60 rounded-xl px-3.5 py-2.5 text-center shadow-lg transition-shadow duration-300"
          style={{
            boxShadow: inRange
              ? `0 8px 30px ${card.accent}35, 0 0 25px ${card.accent}15`
              : `0 4px 15px ${card.accent}15`,
          }}
        >
          <Icon className={`w-5 h-5 mx-auto mb-0.5 ${card.iconColor}`} />
          <p className="text-sm font-semibold text-text dark:text-text-dark whitespace-nowrap">{card.label}</p>
          <p className="text-[10px] text-text-muted dark:text-text-dark-muted whitespace-nowrap">{card.desc}</p>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Component ── */
export default function Login() {
  const { theme, toggle: toggleTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [mouse, setMouse] = useState({ x: -1000, y: -1000 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setMouse({ x: -1000, y: -1000 });
  }, []);

  return (
    <div className="min-h-screen bg-surface-dim dark:bg-surface-dark flex flex-col relative overflow-hidden">

      {/* Subtle background fade blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-[500px] h-[500px] rounded-full bg-primary/8 dark:bg-primary/5 blur-[120px] -top-48 left-1/4" />
        <div className="absolute w-[400px] h-[400px] rounded-full bg-success/6 dark:bg-success/3 blur-[100px] bottom-0 -right-32" />
      </div>

      {/* Top bar: theme toggle */}
      <div className="absolute top-4 right-4 sm:top-5 sm:right-6 z-20">
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg text-text-muted dark:text-text-dark-muted hover:text-text dark:hover:text-text-dark transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-20 xl:gap-28 w-full max-w-6xl">

          {/* Left: Constellation + Tagline */}
          <div className="flex flex-col items-center gap-4 sm:gap-10 animate-[landing-rise_0.8s_ease-out_both]">
            {/* Constellation — hidden on mobile */}
            <div className="hidden sm:block w-full max-w-[560px] overflow-visible relative" style={{ aspectRatio: `${VW}/${VH}` }}>
              <div className="flex justify-center h-full">
                <div
                  ref={containerRef}
                  className="shrink-0 relative"
                  style={{ width: VW, height: VH }}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                >
                  {/* Vortex glow */}
                  <div
                    className="absolute rounded-full opacity-[0.12] dark:opacity-[0.08] blur-sm animate-[landing-vortex_12s_linear_infinite]"
                    style={{
                      width: 320, height: 320,
                      left: CX - 160, top: CY - 160,
                      background: 'conic-gradient(from 0deg, transparent, var(--color-primary), transparent, var(--color-primary-light), transparent)',
                    }}
                  />

                  {/* Energy ribbons SVG */}
                  <svg viewBox={`0 0 ${VW} ${VH}`} className="absolute inset-0 w-full h-full pointer-events-none">
                    <defs>
                      <filter id="ribbon-wobble" x="-20%" y="-20%" width="140%" height="140%">
                        <feTurbulence type="turbulence" baseFrequency="0.012 0.025" numOctaves="3" seed="3" result="turb">
                          <animate attributeName="seed" values="1;4;1" dur="8s" repeatCount="indefinite" />
                        </feTurbulence>
                        <feDisplacementMap in="SourceGraphic" in2="turb" scale="5" xChannelSelector="R" yChannelSelector="G" />
                      </filter>
                      <filter id="ribbon-glow">
                        <feGaussianBlur stdDeviation="2.5" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                      {cards.map((card, i) => (
                        <linearGradient key={`rg-${i}`} id={`ribbon-grad-${i}`} gradientUnits="userSpaceOnUse"
                          x1={card.x} y1={card.y} x2={CX} y2={CY}>
                          <stop offset="0%" stopColor={card.color1} stopOpacity="0.7" />
                          <stop offset="50%" stopColor={card.color2} stopOpacity="0.4" />
                          <stop offset="100%" stopColor={card.color2} stopOpacity="0.02" />
                        </linearGradient>
                      ))}
                    </defs>

                    <g filter="url(#ribbon-wobble)">
                      {cards.map((card, i) => {
                        const path = ribbonPath(card.x, card.y);
                        return (
                          <g key={`r-${i}`} filter="url(#ribbon-glow)">
                            <path d={path} fill="none" stroke={`url(#ribbon-grad-${i})`} strokeWidth="5" strokeLinecap="round" opacity="0.25" />
                            <path d={path} fill="none" stroke={`url(#ribbon-grad-${i})`} strokeWidth="2" strokeLinecap="round" opacity="0.6" strokeDasharray="8 4">
                              <animate attributeName="stroke-dashoffset" from="24" to="0" dur={`${1.5 + i * 0.2}s`} repeatCount="indefinite" />
                            </path>
                            <circle r="2.5" fill={card.color1} opacity="0" filter="url(#ribbon-glow)">
                              <animateMotion dur={`${2.5 + i * 0.3}s`} repeatCount="indefinite" path={path} begin={`${i * 0.4}s`} />
                              <animate attributeName="opacity" values="0;0.7;0.7;0" keyTimes="0;0.1;0.7;1" dur={`${2.5 + i * 0.3}s`} repeatCount="indefinite" begin={`${i * 0.4}s`} />
                              <animate attributeName="r" values="2.5;1.5;0.5" dur={`${2.5 + i * 0.3}s`} repeatCount="indefinite" begin={`${i * 0.4}s`} />
                            </circle>
                          </g>
                        );
                      })}
                    </g>
                  </svg>

                  {/* Center Dumbledore card — glass */}
                  <div className="absolute z-10 -translate-x-1/2 -translate-y-1/2" style={{ left: CX, top: CY }}>
                    <div className="bg-surface/90 dark:bg-surface-dark-dim/85 backdrop-blur-2xl border-2 border-primary/30 dark:border-primary/20 rounded-2xl px-7 py-5 text-center shadow-2xl animate-[landing-center-glow_4s_ease-in-out_infinite]">
                      <img src="/dumbledore-icon.png" alt="Dumbledore" className="w-14 h-14 mx-auto mb-1" />
                      <h2 className="text-2xl font-bold text-text dark:text-text-dark">Dumbledore</h2>
                      <p className="text-[11px] text-text-muted dark:text-text-dark-muted mt-0.5">Unified experience</p>
                    </div>
                  </div>

                  {/* Magnetic glass cards */}
                  {cards.map((card, i) => (
                    <MagneticCard
                      key={card.label}
                      card={card}
                      index={i}
                      mouseX={mouse.x}
                      mouseY={mouse.y}
                    />
                  ))}

                  {/* Cursor glow */}
                  {mouse.x > 0 && (
                    <div
                      className="absolute pointer-events-none rounded-full bg-primary/8 dark:bg-primary/5 blur-3xl transition-opacity duration-300"
                      style={{ width: 200, height: 200, left: mouse.x - 100, top: mouse.y - 100 }}
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="text-center relative z-0 animate-[landing-rise_0.6s_ease-out_0.2s_both]">
              <img src="/dumbledore-icon.png" alt="Dumbledore" className="sm:hidden w-14 h-14 mx-auto mb-3" />
              <h1 className="text-2xl sm:text-3xl font-bold text-text dark:text-text-dark">
                Your Epitech, unified.
              </h1>
              <p className="text-[11px] italic text-text-muted dark:text-text-dark-muted mt-0.5">Currently supported for <span className="font-bold">MsC 1</span> programs only</p>
              <p className="text-sm text-text-muted dark:text-text-dark-muted mt-1">
                Gandalf, Panoramix, and more — in one modern interface.
              </p>
              <a
                href="https://github.com/Yannis-Adn/dumbledore-app"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-text-muted dark:text-text-dark-muted hover:text-primary transition-colors mt-3"
              >
                <Github className="w-3.5 h-3.5" />
                Contribute on GitHub
              </a>
            </div>
          </div>

          {/* Right: Login card (glass) */}
          <div className="animate-[landing-rise_0.6s_ease-out_0.35s_both]">
            <LoginCard glass className="lg:max-w-sm xl:max-w-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
