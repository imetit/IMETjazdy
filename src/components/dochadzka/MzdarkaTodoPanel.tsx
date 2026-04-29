'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle, AlertTriangle, Clock, Lock, TrendingUp, ChevronRight } from 'lucide-react'
import { getMzdarkaTodo, type MzdarkaTodoItem } from '@/actions/dochadzka-todo'

const ICONS = {
  schvalit_hodiny: CheckCircle,
  vybavit_ziadosti: AlertTriangle,
  skontrolovat_auto: Clock,
  spustit_uzavierku: Lock,
  predikcia: TrendingUp,
}

const COLORS: Record<string, string> = {
  high: 'border-red-300 bg-red-50 text-red-900',
  medium: 'border-yellow-300 bg-yellow-50 text-yellow-900',
  low: 'border-blue-300 bg-blue-50 text-blue-900',
}

export default function MzdarkaTodoPanel({ mesiac }: { mesiac?: string }) {
  const [todos, setTodos] = useState<MzdarkaTodoItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMzdarkaTodo(mesiac).then(t => { setTodos(t); setLoading(false) })
  }, [mesiac])

  if (loading || todos.length === 0) return null

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <CheckCircle size={16} className="text-primary" />
        Čo treba urobiť ({todos.length})
      </h3>
      <div className="space-y-2">
        {todos.map((t, i) => {
          const Icon = ICONS[t.typ]
          return (
            <Link
              key={i}
              href={t.link}
              className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${COLORS[t.priorita]} hover:shadow-sm transition-shadow`}
            >
              <div className="flex items-center gap-3 flex-1">
                <Icon size={18} />
                <span className="text-sm">{t.popis}</span>
              </div>
              <ChevronRight size={14} className="opacity-50" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
