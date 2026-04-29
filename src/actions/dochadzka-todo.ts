'use server'

import { requireAdmin } from '@/lib/auth-helpers'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { getAccessibleFirmaIds } from '@/lib/firma-scope'

export interface MzdarkaTodoItem {
  typ: 'schvalit_hodiny' | 'vybavit_ziadosti' | 'skontrolovat_auto' | 'spustit_uzavierku' | 'predikcia'
  pocet: number
  popis: string
  link: string
  priorita: 'high' | 'medium' | 'low'
}

export async function getMzdarkaTodo(mesiac?: string): Promise<MzdarkaTodoItem[]> {
  const auth = await requireAdmin()
  if ('error' in auth) return []

  const m = mesiac || new Date().toISOString().slice(0, 7)
  const accessible = await getAccessibleFirmaIds(auth.user.id)
  const admin = createSupabaseAdmin()

  // Načítaj userov v scope
  let usersQuery = admin.from('profiles').select('id').eq('active', true).neq('role', 'tablet')
  if (accessible !== null) usersQuery = usersQuery.in('firma_id', accessible)
  const { data: users } = await usersQuery
  const userIds = (users || []).map(u => u.id)
  const totalUsers = userIds.length

  if (userIds.length === 0) return []

  // 1. Neschválené hodiny
  const { data: schvalene } = await admin
    .from('dochadzka_schvalene_hodiny').select('user_id')
    .in('user_id', userIds).eq('mesiac', m)
  const schvalSet = new Set((schvalene || []).map(s => s.user_id))
  const neschvalenych = userIds.filter(u => !schvalSet.has(u)).length

  // 2. Žiadosti čakajú
  const { count: ziadCount } = await admin
    .from('dochadzka_korekcia_ziadosti').select('id', { count: 'exact', head: true })
    .in('user_id', userIds).eq('stav', 'caka_na_schvalenie')

  // 3. Auto-doplnené čakajúce kontrolu (aktuálny mesiac)
  const { count: autoCount } = await admin
    .from('dochadzka').select('id', { count: 'exact', head: true })
    .in('user_id', userIds).eq('auto_doplnene', true)
    .gte('datum', `${m}-01`).lte('datum', `${m}-31`)

  // 4. Otvorené uzávierky (ktoré sú zameškané)
  const today = new Date()
  const minulymesiac = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().slice(0, 7)

  let openMonthsCount = 0
  if (accessible !== null) {
    const { data: openUz } = await admin
      .from('dochadzka_uzavierka').select('firma_id, mesiac, stav')
      .in('firma_id', accessible).eq('mesiac', minulymesiac).neq('stav', 'uzavrety')
    openMonthsCount = openUz?.length || 0
  }

  const todos: MzdarkaTodoItem[] = []

  if (autoCount && autoCount > 0) {
    todos.push({
      typ: 'skontrolovat_auto', pocet: autoCount,
      popis: `Skontrolovať ${autoCount} auto-doplnených záznamov`,
      link: `/admin/dochadzka?status=auto_doplnene&mesiac=${m}`,
      priorita: 'high',
    })
  }
  if (ziadCount && ziadCount > 0) {
    todos.push({
      typ: 'vybavit_ziadosti', pocet: ziadCount,
      popis: `Vybaviť ${ziadCount} žiadostí o korekciu`,
      link: '/admin/dochadzka/ziadosti',
      priorita: 'high',
    })
  }
  if (openMonthsCount > 0) {
    todos.push({
      typ: 'spustit_uzavierku', pocet: openMonthsCount,
      popis: `Dokončiť uzávierku ${minulymesiac} (${openMonthsCount} firiem)`,
      link: `/admin/dochadzka/uzavierka?mesiac=${minulymesiac}`,
      priorita: 'high',
    })
  }
  if (neschvalenych > 0 && totalUsers > 0) {
    todos.push({
      typ: 'schvalit_hodiny', pocet: neschvalenych,
      popis: `Schváliť hodiny pre ${neschvalenych} z ${totalUsers} zamestnancov (${m})`,
      link: `/admin/dochadzka?status=neschvaleny&mesiac=${m}`,
      priorita: 'medium',
    })
  }

  // Predikcia — len ak je mesiac aktuálny a aspoň 5 dní pred koncom
  const isCurrentMonth = m === new Date().toISOString().slice(0, 7)
  if (isCurrentMonth) {
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
    const daysLeft = daysInMonth - today.getDate()
    if (daysLeft >= 5 && daysLeft <= 25) {
      todos.push({
        typ: 'predikcia', pocet: 0,
        popis: `Mesiac ${m} sa blíži ku koncu (zostáva ${daysLeft} dní). Skontroluj predčasne anomálie.`,
        link: `/admin/dochadzka?mesiac=${m}&status=anomalie`,
        priorita: 'low',
      })
    }
  }

  return todos
}
