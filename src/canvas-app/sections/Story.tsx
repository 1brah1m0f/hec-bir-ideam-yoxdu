import { Lines, Reveal } from '../components/Reveal'

const STEPS = [
  {
    n: '01',
    title: 'Baza seç',
    body: 'Qara, yaşıl və ya ağ çay — qarışığın onurğası. Biri mütləqdir, ikisi olmur.',
  },
  {
    n: '02',
    title: 'Üstünə qat',
    body: 'Ot, quru meyvə, ədviyyat. Hər tərkibin nisbətini az, orta və ya çox kimi ver; yüz qram özü bölünür.',
  },
  {
    n: '03',
    title: 'Adını yaz, sifariş et',
    body: 'Qarışıq sifarişdən sonra ölçülüb qablaşdırılır. Etiketdə sənin verdiyin ad yazılır.',
  },
]

export function Story() {
  return (
    <>
      <section id="hekaye" className="relative py-[18vh]">
        <div className="mx-auto max-w-7xl px-6 sm:px-10">
          <div className="max-w-[34rem]">
            <Reveal kind="fade">
              <span className="eyebrow">Niyə belə</span>
            </Reveal>

            <Lines
              lines={['Çay şkafda', 'qutu-qutu', 'dayanmasın.']}
              className="mt-6 font-serif text-[clamp(2.1rem,5.6vw,3.6rem)] font-light leading-[1.05] tracking-[-0.015em] text-cream"
              step={100}
            />

            <div className="mt-10 space-y-6 font-serif text-[1.02rem] font-light leading-relaxed text-cream/55 text-pretty">
              <Reveal kind="up" delay={120}>
                <p>
                  Evdə beş növ çay olur, ikisi işlənir. Qalanı qurudur, çünki heç kim onları
                  bir-birinə qatmağı ağlına gətirmir — nə qədər, hansı ilə, nə vaxt.
                </p>
              </Reveal>
              <Reveal kind="up" delay={220}>
                <p>
                  Burada nisbətlə oynayırsan və nəticəni dərhal görürsən: rəng dəyişir, yarpaq
                  suya düşür, buxar qalxır. Bəyəndiyini yüz qramlıq bir bağlamaya çevirirsən.
                </p>
              </Reveal>
              <Reveal kind="up" delay={320}>
                <p className="text-cream/40">
                  Nə abunə, nə minimum sifariş. Bir bağlama da göndəririk.
                </p>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      <section id="nece" className="relative py-[12vh]">
        <div className="mx-auto max-w-7xl px-6 sm:px-10">
          <Reveal kind="fade">
            <span className="eyebrow">Necə işləyir</span>
          </Reveal>
          <div className="mt-10 grid gap-px overflow-hidden rounded-[3px] border border-cream/[0.08] bg-cream/[0.08] sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal
                key={s.n}
                kind="up"
                delay={i * 130}
                className="group relative bg-[#100b07]/85 p-7 backdrop-blur-md transition-colors duration-700 [transition-timing-function:var(--ease)] hover:bg-[#181009]/90 sm:p-9"
              >
                <span className="font-sans text-[11px] tracking-[0.3em] text-brass-500/60 transition-all duration-700 [transition-timing-function:var(--ease)] group-hover:tracking-[0.42em] group-hover:text-brass-400">
                  {s.n}
                </span>
                <h3 className="mt-4 font-serif text-[1.6rem] font-light leading-tight text-cream transition-transform duration-700 [transition-timing-function:var(--ease)] group-hover:translate-x-1">
                  {s.title}
                </h3>
                <p className="mt-3 font-sans text-[13.5px] leading-relaxed text-cream/45">
                  {s.body}
                </p>
                <span
                  aria-hidden="true"
                  className="absolute inset-x-7 bottom-0 h-px origin-left scale-x-0 bg-gradient-to-r from-brass-500/70 to-transparent transition-transform duration-[900ms] [transition-timing-function:var(--ease)] group-hover:scale-x-100 sm:inset-x-9"
                />
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
