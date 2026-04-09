import { getMyNotifikacie, markAllRead } from '@/actions/notifikacie'
import NotifikacieList from '@/components/NotifikacieList'

export default async function NotifikaciePage() {
  const { data, count } = await getMyNotifikacie()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Notifikácie</h2>
        {count > 0 && (
          <form action={markAllRead}>
            <button type="submit" className="text-sm text-primary hover:text-primary-dark font-medium">
              Označiť všetky ako prečítané
            </button>
          </form>
        )}
      </div>

      <NotifikacieList notifikacie={data} />
    </div>
  )
}
