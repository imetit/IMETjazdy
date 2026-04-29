import { redirect } from 'next/navigation'
import { getSession } from '@/lib/get-session'
import BulkImportForm from '@/components/dochadzka/BulkImportForm'

export default async function Page() {
  const { profile } = await getSession()
  if (!profile) redirect('/login')

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Bulk import dochádzky</h2>
      <p className="text-sm text-gray-500 mb-4">Pre prechod zo starého systému — nahrajte XLSX s historickými záznamami.</p>
      <BulkImportForm />
    </div>
  )
}
