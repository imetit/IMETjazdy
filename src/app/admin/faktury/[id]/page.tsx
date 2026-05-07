import { notFound, redirect } from 'next/navigation'
import { getFakturaDetail } from '@/actions/faktury'
import { getSession } from '@/lib/get-session'
import FakturaDetailClient from '@/components/faktury/FakturaDetailClient'

export default async function FakturaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [{ profile }, result] = await Promise.all([getSession(), getFakturaDetail(id)])
  if (!profile) redirect('/login')
  if ('error' in result || !result.data) notFound()
  return <FakturaDetailClient initialData={result.data as never} currentUserId={profile.id} currentUserRole={profile.role} />
}
