'use server'

import { requireAdmin } from '@/lib/auth-helpers'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { revalidatePath, updateTag } from 'next/cache'
import { logAudit } from './audit'
import { isUzavretyMesiac } from '@/lib/dochadzka-uzavierka'

interface ZaznamData {
  user_id: string
  datum: string
  smer: 'prichod' | 'odchod'
  dovod: string
  cas: string  // ISO datetime
  korekcia_dovod: string
}

async function checkUzavierka(userId: string, datum: string): Promise<{ blocked: boolean; reason?: string }> {
  const admin = createSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles')
    .select('firma_id')
    .eq('id', userId)
    .single<{ firma_id: string | null }>()
  const blocked = await isUzavretyMesiac(profile?.firma_id || null, datum)
  if (blocked) return { blocked: true, reason: 'Mesiac je uzavretý. Pre úpravy kontaktujte IT admina.' }
  return { blocked: false }
}

export async function pridatZaznam(data: ZaznamData) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth
  if (!data.korekcia_dovod?.trim()) return { error: 'Dôvod korektúry je povinný' }

  const block = await checkUzavierka(data.user_id, data.datum)
  if (block.blocked) return { error: block.reason }

  const admin = createSupabaseAdmin()
  const { error } = await admin.from('dochadzka').insert({
    user_id: data.user_id,
    datum: data.datum,
    smer: data.smer,
    dovod: data.dovod,
    cas: data.cas,
    zdroj: 'manual',
    korekcia_dovod: data.korekcia_dovod,
    upravil_id: auth.user.id,
    upravene_at: new Date().toISOString(),
  })
  if (error) return { error: 'Chyba pri uložení: ' + error.message }

  await logAudit('dochadzka_pridanie', 'dochadzka', data.user_id, { datum: data.datum, smer: data.smer, dovod: data.dovod })

  await admin.from('notifikacie').insert({
    user_id: data.user_id,
    typ: 'dochadzka_korekcia',
    nadpis: 'Dochádzka upravená',
    sprava: `Mzdárka pridala záznam ${data.datum}. Dôvod: ${data.korekcia_dovod}`,
    link: '/dochadzka-prehled',
  })

  // Zruší schválenie hodín pre tento mesiac
  await admin.from('dochadzka_schvalene_hodiny').delete()
    .eq('user_id', data.user_id).eq('mesiac', data.datum.slice(0, 7))

  revalidatePath(`/admin/dochadzka/${data.user_id}`)
  revalidatePath('/dochadzka-prehled'); updateTag('dochadzka')
}

export async function upravitZaznam(
  zaznamId: string,
  novyCas: string,
  novySmer: 'prichod' | 'odchod',
  novyDovod: string,
  dovod_korekcie: string,
) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth
  if (!dovod_korekcie?.trim()) return { error: 'Dôvod korektúry je povinný' }

  const admin = createSupabaseAdmin()
  const { data: original } = await admin
    .from('dochadzka')
    .select('user_id, datum, cas')
    .eq('id', zaznamId)
    .single<{ user_id: string; datum: string; cas: string }>()

  if (!original) return { error: 'Záznam nenájdený' }

  const block = await checkUzavierka(original.user_id, original.datum)
  if (block.blocked) return { error: block.reason }

  const { error } = await admin.from('dochadzka').update({
    cas: novyCas,
    smer: novySmer,
    dovod: novyDovod,
    povodny_cas: original.cas,
    korekcia_dovod: dovod_korekcie,
    upravil_id: auth.user.id,
    upravene_at: new Date().toISOString(),
  }).eq('id', zaznamId)

  if (error) return { error: 'Chyba pri úprave: ' + error.message }

  await logAudit('dochadzka_uprava', 'dochadzka', zaznamId, { dovod_korekcie })

  await admin.from('notifikacie').insert({
    user_id: original.user_id,
    typ: 'dochadzka_korekcia',
    nadpis: 'Dochádzka upravená',
    sprava: `Mzdárka upravila záznam ${original.datum}. Dôvod: ${dovod_korekcie}`,
    link: '/dochadzka-prehled',
  })

  await admin.from('dochadzka_schvalene_hodiny').delete()
    .eq('user_id', original.user_id).eq('mesiac', original.datum.slice(0, 7))

  revalidatePath(`/admin/dochadzka/${original.user_id}`)
  revalidatePath('/dochadzka-prehled'); updateTag('dochadzka')
}

export async function zmazatZaznam(zaznamId: string, dovod: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth
  if (!dovod?.trim()) return { error: 'Dôvod je povinný' }

  const admin = createSupabaseAdmin()
  const { data: original } = await admin
    .from('dochadzka')
    .select('user_id, datum')
    .eq('id', zaznamId)
    .single<{ user_id: string; datum: string }>()

  if (!original) return { error: 'Záznam nenájdený' }

  const block = await checkUzavierka(original.user_id, original.datum)
  if (block.blocked) return { error: block.reason }

  // Najprv update s dôvodom (aby trigger zachytil)
  await admin.from('dochadzka').update({
    korekcia_dovod: dovod,
    upravil_id: auth.user.id,
    upravene_at: new Date().toISOString(),
  }).eq('id', zaznamId)

  const { error } = await admin.from('dochadzka').delete().eq('id', zaznamId)
  if (error) return { error: 'Chyba pri mazaní: ' + error.message }

  await logAudit('dochadzka_zmazanie', 'dochadzka', zaznamId, { dovod, datum: original.datum })

  revalidatePath(`/admin/dochadzka/${original.user_id}`)
}
