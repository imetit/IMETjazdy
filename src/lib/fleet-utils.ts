export type KontrolaStatus = 'platne' | 'blizi_sa' | 'expirovane'

export function getKontrolaStatus(platnostDo: string): KontrolaStatus {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(platnostDo)
  expiry.setHours(0, 0, 0, 0)

  const diffMs = expiry.getTime() - today.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'expirovane'
  if (diffDays <= 30) return 'blizi_sa'
  return 'platne'
}

export function getStatusColor(status: KontrolaStatus): string {
  switch (status) {
    case 'platne': return 'bg-green-100 text-green-800'
    case 'blizi_sa': return 'bg-orange-100 text-orange-800'
    case 'expirovane': return 'bg-red-100 text-red-800'
  }
}

export function getStatusLabel(status: KontrolaStatus): string {
  switch (status) {
    case 'platne': return 'Platné'
    case 'blizi_sa': return 'Blíži sa koniec'
    case 'expirovane': return 'Expirované'
  }
}

export function getDaysUntilExpiry(platnostDo: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(platnostDo)
  expiry.setHours(0, 0, 0, 0)
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('sk-SK')
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' }).format(amount)
}
