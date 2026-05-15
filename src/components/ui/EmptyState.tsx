import type { ComponentType } from 'react'
import Link from 'next/link'
import { Inbox } from 'lucide-react'

/**
 * Štandardizovaný empty state pre tabuľky, zoznamy, dashboard sekcie.
 * Použiť kdekoľvek máš podmienku `data.length === 0`.
 *
 * @example
 * {jazdy.length === 0 && <EmptyState label="Žiadne jazdy" hint="Začni cez 'Nová jazda'" />}
 */
export default function EmptyState({
  icon: Icon = Inbox,
  label,
  hint,
  cta,
  compact = false,
}: {
  icon?: ComponentType<{ size?: number; className?: string; strokeWidth?: number }>
  label: string
  hint?: string
  cta?: { href: string; label: string } | { onClick: () => void; label: string }
  compact?: boolean
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8' : 'py-16'} px-6`}>
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 mb-4">
        <Icon size={22} strokeWidth={1.5} />
      </div>
      <p className="text-sm font-medium text-gray-700">{label}</p>
      {hint && <p className="mt-1 text-xs text-gray-500 max-w-sm">{hint}</p>}
      {cta && (
        <div className="mt-5">
          {'href' in cta ? (
            <Link href={cta.href} className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-lg transition-colors">
              {cta.label}
            </Link>
          ) : (
            <button onClick={cta.onClick} type="button" className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-lg transition-colors">
              {cta.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
