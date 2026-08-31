import { useCallback, useEffect, useState, type AnchorHTMLAttributes } from 'react'

/**
 * A router in forty lines. Four routes and no nested layouts do not justify a
 * dependency — and the whole point of staying client-side here is that the
 * canvas keeps running across a navigation, which a real page load would kill.
 */

export const ROUTES = {
  landing: '/',
  mix: '/qaris',
  cart: '/sebet',
  pay: '/odenis',
  done: '/hazir',
} as const

export type Route = (typeof ROUTES)[keyof typeof ROUTES]

const listeners = new Set<(path: string) => void>()

function current(): string {
  const path = window.location.pathname.replace(/\/+$/, '')
  return path === '' ? '/' : path
}

export function navigate(to: string, { replace = false } = {}) {
  if (to === current()) return
  if (replace) window.history.replaceState(null, '', to)
  else window.history.pushState(null, '', to)
  for (const l of listeners) l(to)
}

export function useRoute(): string {
  const [path, setPath] = useState(current)

  useEffect(() => {
    const update = () => setPath(current())
    listeners.add(update)
    window.addEventListener('popstate', update)
    return () => {
      listeners.delete(update)
      window.removeEventListener('popstate', update)
    }
  }, [])

  return path
}

interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string
}

export function Link({ to, onClick, ...rest }: LinkProps) {
  const handle = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      onClick?.(e)
      // let the browser keep new-tab, download and modified clicks
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return
      e.preventDefault()
      navigate(to)
    },
    [to, onClick],
  )
  return <a href={to} onClick={handle} {...rest} />
}
