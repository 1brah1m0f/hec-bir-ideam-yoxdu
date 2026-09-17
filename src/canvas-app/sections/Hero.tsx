import { Lines, Reveal } from '../components/Reveal'
import { useGlassAnchor } from '../components/GlassStage'
import { ENTRY_OPTIONS } from '../../shared/lib/presets'
import type { EntryChoice } from '../../shared/types'

interface Props {
  onChoose: (id: EntryChoice) => void
  onStart: () => void
}

export function Hero({ onChoose, onStart }: Props) {
  // the only anchor on this page: the glass rides this box up and off the screen
  // as the hero scrolls away, and never reappears further down
  const anchor = useGlassAnchor('hero', 0.92)

  return (
    <section id="bas" className="relative min-h-[100svh]">
      <div
        ref={anchor}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-[7svh] h-[40svh] lg:inset-y-0 lg:left-[46%] lg:h-auto"
      />

      {/* the floor the copy stands on, so the glass never bleeds into the text */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[56svh] bg-gradient-to-t from-[#0d0906] via-[#0d0906]/92 to-transparent lg:hidden"
      />

      <div className="relative mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-end px-6 pb-14 pt-[46svh] sm:px-10 lg:justify-center lg:pb-16 lg:pt-28">
        <div className="max-w-[36rem]">
          <Reveal kind="fade">
            <span className="eyebrow inline-flex items-center gap-2">
              <span aria-hidden="true" className="relative flex h-1.5 w-1.5">
                <span className="animate-glow absolute inset-0 rounded-full bg-brass-400" />
                <span className="absolute inset-0 rounded-full bg-brass-400" />
              </span>
              Azərbaycan çay ritualı · Sənin dadına görə
            </span>
          </Reveal>

          <Lines
            lines={['Öz çayını', 'öz zövqünlə yarat.']}
            className="mt-5 font-serif text-[clamp(2.9rem,8.6vw,5.6rem)] font-light leading-[0.94] tracking-[-0.02em] text-cream"
            delay={120}
            step={110}
          />

          <Reveal kind="up" delay={420}>
            <p className="mt-7 max-w-[30rem] font-serif text-[1.06rem] font-light leading-relaxed text-cream/60 text-pretty sm:text-[1.15rem]">
              On yeddi tərkib. Yüz qram. Kəklikotunu zoğalla, lavandanı ağ çayla
              qarışdır — bankaya nəyin töküldüyünü elə burada, canlı gör.
            </p>
            <p className="mt-4 max-w-[30rem] font-sans text-[13.5px] leading-relaxed text-cream/45 text-pretty">
              Sevdiyiniz tərkibləri seçin, qarışığınız gözünüzün önündə formalaşsın və
              adınızla paketlənsin.
            </p>
          </Reveal>

          <Reveal kind="up" delay={560}>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <button type="button" onClick={onStart} className="btn btn-gold">
                Öz qarışığımı yarat
              </button>
              <a href="#dad" className="btn btn-ghost">
                Mənə uyğun dadı tap
              </a>
            </div>
          </Reveal>

          <Reveal kind="up" delay={700}>
            <div id="dad" className="mt-11 scroll-mt-24">
              <div className="mb-3 font-sans text-[11px] tracking-[0.2em] text-cream/30">
                VƏ YA HAZIR BİR YERDƏN BAŞLA
              </div>
              <div className="flex flex-wrap gap-2">
                {ENTRY_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChoose(opt.id)}
                    className="group rounded-[3px] border border-cream/12 bg-cream/[0.02] px-4 py-2.5 text-left transition-all duration-500 [transition-timing-function:var(--ease)] hover:-translate-y-0.5 hover:border-brass-500/60 hover:bg-brass-500/[0.08]"
                  >
                    <span className="block font-serif text-[15px] text-cream">{opt.label}</span>
                    <span className="block font-sans text-[10.5px] text-cream/35 transition-colors group-hover:text-cream/60">
                      {opt.hint}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      <a
        href="#hekaye"
        aria-label="Aşağı sürüşdür"
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 lg:flex"
      >
        <span className="font-sans text-[10px] tracking-[0.3em] text-cream/30">AŞAĞI</span>
        <svg width="14" height="22" viewBox="0 0 14 22" className="animate-cue text-brass-400">
          <path
            d="M7 2v16M2 13l5 5 5-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </a>
    </section>
  )
}
