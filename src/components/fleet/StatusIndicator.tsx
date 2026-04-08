'use client'

import { getKontrolaStatus, getStatusColor, getStatusLabel, getDaysUntilExpiry } from '@/lib/fleet-utils'

export default function StatusIndicator({ platnostDo }: { platnostDo: string }) {
  const status = getKontrolaStatus(platnostDo)
  const color = getStatusColor(status)
  const label = getStatusLabel(status)
  const days = getDaysUntilExpiry(platnostDo)

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${color}`}>
      {label}
      {status === 'blizi_sa' && <span>({days} dní)</span>}
      {status === 'expirovane' && <span>({Math.abs(days)} dní po)</span>}
    </span>
  )
}
