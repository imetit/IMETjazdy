'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Wifi, WifiOff } from 'lucide-react'

export default function RealtimeVPraciIndicator({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount)
  const [connected, setConnected] = useState(false)
  const [lastEvent, setLastEvent] = useState<string>('')

  useEffect(() => {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const channel = sb
      .channel('dochadzka-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dochadzka' }, (payload) => {
        const row = payload.new as { smer: string; datum: string; cas: string; zdroj: string }
        const today = new Date().toISOString().split('T')[0]
        if (row.datum !== today) return
        if (row.smer === 'prichod') {
          setCount(c => c + 1)
          setLastEvent(`Príchod o ${new Date(row.cas).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}`)
        } else if (row.smer === 'odchod') {
          setCount(c => Math.max(0, c - 1))
          setLastEvent(`Odchod o ${new Date(row.cas).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}`)
        }
        setTimeout(() => setLastEvent(''), 5000)
      })
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED')
      })

    return () => { sb.removeChannel(channel) }
  }, [])

  return (
    <div className="flex items-center gap-2 text-xs">
      {connected
        ? <Wifi size={12} className="text-green-600" />
        : <WifiOff size={12} className="text-gray-400" />}
      <span className={connected ? 'text-green-700' : 'text-gray-400'}>
        {connected ? `Live · ${count}` : `${count}`}
      </span>
      {lastEvent && <span className="text-blue-600 italic">· {lastEvent}</span>}
    </div>
  )
}
