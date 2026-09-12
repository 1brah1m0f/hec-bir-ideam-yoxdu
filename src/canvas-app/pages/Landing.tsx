import { Hero } from '../sections/Hero'
import { Marquee } from '../sections/Marquee'
import { Story } from '../sections/Story'
import { Catalog } from '../sections/Catalog'
import { Footer } from '../sections/Footer'
import type { EntryChoice } from '../../shared/types'

interface Props {
  selected: Set<string>
  onChoose: (id: EntryChoice) => void
  onPick: (id: string) => void
  onStart: () => void
}

export function Landing({ selected, onChoose, onPick, onStart }: Props) {
  return (
    <>
      <main>
        <Hero onChoose={onChoose} onStart={onStart} />
        <Marquee />
        <Story />
        <Catalog selected={selected} onPick={onPick} onStart={onStart} />
      </main>
      <Footer />
    </>
  )
}
