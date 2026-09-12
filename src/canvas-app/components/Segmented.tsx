import type { CSSProperties } from 'react'

export interface SegmentOption<T> {
  id: T
  label: string
  /** small second line under the label, e.g. a price */
  hint?: string
}

interface Props<T> {
  value: T
  options: SegmentOption<T>[]
  onChange: (v: T) => void
  ariaLabel: string
  /** compact for inline rows, regular for standalone controls */
  size?: 'sm' | 'md'
  /** square corners for a control that sits inside a list */
  square?: boolean
  className?: string
}

/**
 * A row of options with one pill sliding behind the active one. The pill is a
 * single element moved by a transform, so a change reads as the selection
 * travelling rather than one button lighting up as another goes dark.
 */
export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  ariaLabel,
  size = 'md',
  square = false,
  className = '',
}: Props<T>) {
  const at = Math.max(
    0,
    options.findIndex((o) => o.id === value),
  )
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={[
        'seg',
        size === 'sm' ? 'seg-sm' : '',
        square ? 'seg-square' : '',
        className,
      ].join(' ')}
      style={{ '--n': options.length, '--at': at } as CSSProperties}
    >
      <span aria-hidden="true" className="seg-pill" />
      {options.map((o) => {
        const on = o.id === value
        return (
          <button
            key={String(o.id)}
            type="button"
            onClick={() => onChange(o.id)}
            aria-pressed={on}
            className={`seg-btn${on ? ' is-on' : ''}`}
          >
            <span className="block leading-tight">{o.label}</span>
            {o.hint && <span className="seg-hint">{o.hint}</span>}
          </button>
        )
      })}
    </div>
  )
}
