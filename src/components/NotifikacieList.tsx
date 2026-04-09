'use client'

import { Bell, Check } from 'lucide-react'
import { markNotifikaciaRead } from '@/actions/notifikacie'
import { useRouter } from 'next/navigation'
import type { Notifikacia } from '@/lib/types'

interface Props {
  notifikacie: Notifikacia[]
}

export default function NotifikacieList({ notifikacie }: Props) {
  const router = useRouter()

  async function handleClick(notif: Notifikacia) {
    if (!notif.precitane) {
      await markNotifikaciaRead(notif.id)
    }
    if (notif.link) {
      router.push(notif.link)
    }
    router.refresh()
  }

  if (notifikacie.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <Bell size={32} className="mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500">Žiadne notifikácie</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {notifikacie.map(n => (
        <div
          key={n.id}
          onClick={() => handleClick(n)}
          className={`flex items-start gap-3 px-4 py-3 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 ${
            !n.precitane ? 'bg-teal-50/50' : ''
          }`}
        >
          <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${!n.precitane ? 'bg-teal-500' : 'bg-transparent'}`} />
          <div className="flex-1 min-w-0">
            <p className={`text-sm ${!n.precitane ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{n.nadpis}</p>
            {n.sprava && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.sprava}</p>}
            <p className="text-[11px] text-gray-400 mt-1">
              {new Date(n.created_at).toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          {!n.precitane && <Check size={14} className="text-gray-400 mt-1 shrink-0" />}
        </div>
      ))}
    </div>
  )
}
