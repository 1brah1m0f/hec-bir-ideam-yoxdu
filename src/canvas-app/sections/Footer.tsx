import { Reveal } from '../components/Reveal'
import { DELIVERY, manat } from '../../shared/lib/pricing'

export function Footer() {
  return (
    <footer className="relative border-t border-cream/[0.08] bg-[#0a0705]/85 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-6 py-14 sm:px-10">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <Reveal kind="up">
            <div className="flex items-center gap-2.5">
              <svg
                viewBox="0 0 40 64"
                className="h-7 w-[18px] text-brass-400/80"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                aria-hidden="true"
              >
                <path d="M7.5 7c0 8 3.5 11 3.5 17s-6.5 5-6.5 13 6.5 15 15.5 15 15.5-7 15.5-15-6.5-7-6.5-13 3.5-9 3.5-17" />
                <ellipse cx="20" cy="7" rx="12.5" ry="3" />
              </svg>
              <span className="font-serif text-lg font-light text-cream">Öz çayın</span>
            </div>
            <p className="mt-4 max-w-[22rem] font-sans text-[12.5px] leading-relaxed text-cream/35">
              Fərdi çay qarışıqları. Hər bağlama sifarişdən sonra ölçülür, qarışdırılır və
              etiketlənir.
            </p>
          </Reveal>

          <Reveal kind="up" delay={90}>
            <h4 className="font-sans text-[11px] tracking-[0.2em] text-cream/40">ÇATDIRILMA</h4>
            <ul className="mt-4 space-y-1.5 font-sans text-[12.5px] text-cream/45">
              <li>Bakı və Sumqayıt — {manat(DELIVERY.baku)}</li>
              <li>Digər şəhərlər — {manat(DELIVERY.regions)}</li>
              <li className="text-brass-400/70">
                {manat(DELIVERY.freeOver)} üzəri sifarişə pulsuz
              </li>
              <li className="pt-1 text-cream/30">Hazırlanma 1–2 iş günü</li>
            </ul>
          </Reveal>

          <Reveal kind="up" delay={180}>
            <h4 className="font-sans text-[11px] tracking-[0.2em] text-cream/40">ƏLAQƏ</h4>
            <ul className="mt-4 space-y-1.5 font-sans text-[12.5px] text-cream/45">
              <li>
                <a
                  href="tel:+994500000000"
                  className="transition-colors hover:text-brass-400"
                >
                  +994 50 000 00 00
                </a>
              </li>
              <li>
                <a
                  href="mailto:salam@ozcayin.az"
                  className="transition-colors hover:text-brass-400"
                >
                  salam@ozcayin.az
                </a>
              </li>
              <li className="pt-1 text-cream/30">Hər gün 10:00 — 20:00</li>
            </ul>
          </Reveal>

          <Reveal kind="up" delay={270}>
            <h4 className="font-sans text-[11px] tracking-[0.2em] text-cream/40">QEYD</h4>
            <p className="mt-4 font-sans text-[11.5px] leading-relaxed text-cream/30">
              Bitki qarışıqları dərman deyil. Hamiləlik dövründə, uşaqlar üçün və ya müntəzəm
              dərman qəbulu zamanı istifadədən əvvəl həkimlə məsləhətləşin.
            </p>
          </Reveal>
        </div>

        <div className="mt-12 border-t border-cream/[0.07] pt-6">
          <span className="font-sans text-[11px] text-cream/25">
            © {new Date().getFullYear()} Öz çayın · Bakı, Azərbaycan
          </span>
        </div>
      </div>
    </footer>
  )
}
