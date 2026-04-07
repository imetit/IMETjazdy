import type { JazdaStav } from '@/lib/types'

const styles: Record<JazdaStav, string> = {
  rozpracovana: 'bg-yellow-100 text-yellow-800',
  odoslana: 'bg-blue-100 text-blue-800',
  spracovana: 'bg-green-100 text-green-800',
}

const labels: Record<JazdaStav, string> = {
  rozpracovana: 'Rozpracovaná',
  odoslana: 'Odoslaná',
  spracovana: 'Spracovaná',
}

export default function StatusBadge({ stav }: { stav: JazdaStav }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[stav]}`}>
      {labels[stav]}
    </span>
  )
}
