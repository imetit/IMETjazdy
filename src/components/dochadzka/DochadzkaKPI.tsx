'use client'
import { Users, Clock, AlertTriangle, TrendingUp } from 'lucide-react'
import RealtimeVPraciIndicator from './RealtimeVPraciIndicator'

interface Props {
  vPraciCount: number
  autoDoplneneCount: number
  anomaliCount: number
  topNadcasy: Array<{ name: string; hours: number }>
  onFilter?: (status: 'all' | 'auto_doplnene' | 'anomalie') => void
}

export default function DochadzkaKPI({ vPraciCount, autoDoplneneCount, anomaliCount, topNadcasy, onFilter }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <div className="flex items-center gap-2 text-green-700">
          <Users size={18} />
          <span className="text-xs font-medium">V práci práve teraz</span>
        </div>
        <div className="text-2xl font-bold text-green-900 mt-1">{vPraciCount}</div>
        <div className="mt-1">
          <RealtimeVPraciIndicator initialCount={vPraciCount} />
        </div>
      </div>

      <button
        onClick={() => onFilter?.('auto_doplnene')}
        className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-left hover:bg-yellow-100 transition-colors"
      >
        <div className="flex items-center gap-2 text-yellow-700">
          <Clock size={18} />
          <span className="text-xs font-medium">Auto-doplnené</span>
        </div>
        <div className="text-2xl font-bold text-yellow-900 mt-1">{autoDoplneneCount}</div>
        <div className="text-[10px] text-yellow-700 mt-0.5">čaká kontrolu</div>
      </button>

      <button
        onClick={() => onFilter?.('anomalie')}
        className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-left hover:bg-orange-100 transition-colors"
      >
        <div className="flex items-center gap-2 text-orange-700">
          <AlertTriangle size={18} />
          <span className="text-xs font-medium">Anomálie</span>
        </div>
        <div className="text-2xl font-bold text-orange-900 mt-1">{anomaliCount}</div>
        <div className="text-[10px] text-orange-700 mt-0.5">vyžadujú pozornosť</div>
      </button>

      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <div className="flex items-center gap-2 text-red-700">
          <TrendingUp size={18} />
          <span className="text-xs font-medium">Top nadčasy</span>
        </div>
        <div className="text-xs text-red-900 mt-1 space-y-0.5">
          {topNadcasy.length === 0 && <div className="text-gray-400">—</div>}
          {topNadcasy.slice(0, 3).map(t => (
            <div key={t.name} className="truncate">{t.name}: <span className="font-bold">{t.hours.toFixed(1)}h</span></div>
          ))}
        </div>
      </div>
    </div>
  )
}
