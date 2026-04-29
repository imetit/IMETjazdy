import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getZamestnanecDetail } from '@/actions/admin-dochadzka-mzdy'
import AdminDochadzkaDetailClient from '@/components/dochadzka/AdminDochadzkaDetailClient'

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>
  searchParams: Promise<{ mesiac?: string }>
}) {
  const { userId } = await params
  const sp = await searchParams
  const mesiac = sp.mesiac || new Date().toISOString().slice(0, 7)

  const result = await getZamestnanecDetail(userId, mesiac)
  if ('error' in result && result.error) redirect('/admin/dochadzka')

  return (
    <div>
      <Link
        href={`/admin/dochadzka?mesiac=${mesiac}`}
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-primary mb-4"
      >
        <ChevronLeft size={16} /> Späť na prehľad
      </Link>

      <AdminDochadzkaDetailClient
        userId={userId}
        mesiac={mesiac}
        profile={result.profile as never}
        zaznamy={result.zaznamy as never}
        ziadosti={result.ziadosti as never}
        anomalie={result.anomalie || []}
        priplatky={result.priplatky || { nocna_hod: 0, sobota_hod: 0, nedela_hod: 0, sviatok_hod: 0, nadcas_hod: 0 }}
        schvalenie={result.schvalenie}
      />
    </div>
  )
}
