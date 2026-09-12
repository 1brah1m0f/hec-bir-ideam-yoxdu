import type { CartLine, Customer, OrderResponse } from '../../shared/types'

/**
 * The server recalculates every price from its own copy of the catalogue, so
 * what we send is the recipe and the quantity — never a total. The prices in
 * the payload are there only so the server can tell us if the page was showing
 * something stale.
 */
export interface OrderPayload {
  musteri: Customer
  setirler: {
    ad: string
    say: number
    /** package size in grams */
    qram: number
    gosterilenQiymet: number
    terkib: { id: string; level: string; qram: number }[]
  }[]
}

export function buildPayload(customer: Customer, lines: CartLine[]): OrderPayload {
  return {
    musteri: customer,
    setirler: lines.map((l) => ({
      ad: l.name,
      say: l.qty,
      qram: l.grams,
      gosterilenQiymet: l.unitPrice,
      terkib: l.items.map((i) => ({
        id: i.ingredientId,
        level: i.level,
        qram: i.grams,
      })),
    })),
  }
}

export class OrderError extends Error {
  fields: Record<string, string>
  constructor(message: string, fields: Record<string, string> = {}) {
    super(message)
    this.name = 'OrderError'
    this.fields = fields
  }
}

export async function sendOrder(payload: OrderPayload): Promise<OrderResponse> {
  let res: Response
  try {
    res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new OrderError('Serverə qoşulmaq alınmadı. İnternet bağlantınızı yoxlayın.')
  }

  let body: unknown
  try {
    body = await res.json()
  } catch {
    throw new OrderError('Serverdən gözlənilməz cavab gəldi.')
  }

  const data = body as Partial<OrderResponse> & { xeta?: string; sahələr?: Record<string, string> }
  if (!res.ok || !data.nomre) {
    throw new OrderError(data.xeta ?? 'Sifariş qeydə alınmadı.', data.sahələr ?? {})
  }
  return data as OrderResponse
}
