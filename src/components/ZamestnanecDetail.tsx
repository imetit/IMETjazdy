'use client'

import { ArrowLeft, CarFront } from 'lucide-react'
import Link from 'next/link'
import type { Profile, Vozidlo } from '@/lib/types'
import type { ZamestnanecMajetok, ZamestnanecLicencia } from '@/lib/majetok-types'
import MajetokSection from './MajetokSection'
import LicencieSection from './LicencieSection'
import { formatCurrency } from '@/lib/fleet-utils'

interface Props {
  profile: Profile
  vozidlo: Vozidlo | null
  majetok: ZamestnanecMajetok[]
  licencie: ZamestnanecLicencia[]
  canSeePrices: boolean
  readonly: boolean
  backUrl?: string
}

export default function ZamestnanecDetail({ profile, vozidlo, majetok, licencie, canSeePrices, readonly, backUrl }: Props) {
  const majetokValue = majetok
    .filter(m => m.stav === 'pridelene')
    .reduce((sum, m) => sum + (m.obstaravacia_cena || 0), 0)
  const licencieValue = licencie
    .reduce((sum, l) => sum + (l.cena || 0), 0)
  const vozidloValue = vozidlo?.obstaravacia_cena || 0
  const totalValue = majetokValue + licencieValue + vozidloValue

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {backUrl && (
          <Link href={backUrl} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft size={20} /></Link>
        )}
        <div>
          <h1 className="text-2xl font-bold">{profile.full_name}</h1>
          <p className="text-gray-500">{profile.email}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${profile.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
          {profile.active ? 'Aktívny' : 'Neaktívny'}
        </span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Pridelené vozidlo</h3>
        {vozidlo ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CarFront size={20} className="text-gray-400" />
              <div>
                <p className="font-medium">{vozidlo.znacka} {vozidlo.variant}</p>
                <p className="text-sm text-gray-500 font-mono">{vozidlo.spz}</p>
              </div>
            </div>
            {canSeePrices && vozidlo.obstaravacia_cena && (
              <span className="text-sm text-gray-500">{formatCurrency(vozidlo.obstaravacia_cena)}</span>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Žiadne pridelené vozidlo</p>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <MajetokSection userId={profile.id} majetok={majetok} readonly={readonly} canSeePrices={canSeePrices} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <LicencieSection userId={profile.id} licencie={licencie} readonly={readonly} canSeePrices={canSeePrices} />
      </div>

      {canSeePrices && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Celková hodnota majetku</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">IT vybavenie</p>
              <p className="text-lg font-bold">{formatCurrency(majetokValue)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Licencie</p>
              <p className="text-lg font-bold">{formatCurrency(licencieValue)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Vozidlo</p>
              <p className="text-lg font-bold">{formatCurrency(vozidloValue)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Celkom</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(totalValue)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
