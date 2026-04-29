'use server'

import { requireAuth, requireAdmin } from '@/lib/auth-helpers'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { revalidatePath } from 'next/cache'
import { logAudit } from './audit'

export async function vytvoritZiadost(data: {
  datum: string
  navrh_smer?: 'prichod' | 'odchod'
  navrh_dovod?: string
  navrh_cas?: string
  poznamka: string
  povodny_zaznam_id?: string
}) {
  const auth = await requireAuth()
  if ('error' in auth) return auth
  if (!data.poznamka?.trim()) return { error: 'Poznámka je povinná' }

  const admin = createSupabaseAdmin()
  const { error } = await admin.from('dochadzka_korekcia_ziadosti').insert({
    user_id: auth.user.id,
    datum: data.datum,
    navrh_smer: data.navrh_smer || null,
    navrh_dovod: data.navrh_dovod || null,
    navrh_cas: data.navrh_cas || null,
    poznamka_zamestnanec: data.poznamka,
    povodny_zaznam_id: data.povodny_zaznam_id || null,
  })
  if (error) return { error: 'Chyba pri uložení žiadosti' }

  // Notifikuj mzdárky
  const { data: mzdarky } = await admin
    .from('profiles').select('id, firma_id')
    .in('role', ['admin', 'it_admin', 'fin_manager']).eq('active', true)

  for (const m of mzdarky || []) {
    await admin.from('notifikacie').insert({
      user_id: m.id,
      typ: 'dochadzka_ziadost',
      nadpis: 'Nová žiadosť o korekciu dochádzky',
      sprava: `${auth.profile.full_name} žiada opravu na ${data.datum}: ${data.poznamka.slice(0, 80)}${data.poznamka.length > 80 ? '…' : ''}`,
      link: '/admin/dochadzka/ziadosti',
    })
  }

  revalidatePath('/dochadzka-prehled')
}

export async function schvalitZiadost(ziadostId: string, poznamka_mzdarka?: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const admin = createSupabaseAdmin()
  const { data: z } = await admin.from('dochadzka_korekcia_ziadosti').select('*').eq('id', ziadostId).single()
  if (!z) return { error: 'Žiadosť nenájdená' }

  // Ak je v žiadosti návrh, aplikuj korekciu cez priame DB calls
  if (z.povodny_zaznam_id && z.navrh_cas) {
    await admin.from('dochadzka').update({
      cas: z.navrh_cas,
      smer: z.navrh_smer || 'prichod',
      dovod: z.navrh_dovod || 'praca',
      korekcia_dovod: `Schválená žiadosť: ${z.poznamka_zamestnanec}`,
      upravil_id: auth.user.id,
      upravene_at: new Date().toISOString(),
    }).eq('id', z.povodny_zaznam_id)
  } else if (z.navrh_cas && z.navrh_smer && z.navrh_dovod) {
    await admin.from('dochadzka').insert({
      user_id: z.user_id,
      datum: z.datum,
      smer: z.navrh_smer,
      dovod: z.navrh_dovod,
      cas: z.navrh_cas,
      zdroj: 'manual',
      korekcia_dovod: `Schválená žiadosť: ${z.poznamka_zamestnanec}`,
      upravil_id: auth.user.id,
      upravene_at: new Date().toISOString(),
    })
  }

  await admin.from('dochadzka_korekcia_ziadosti').update({
    stav: 'schvalena',
    vybavila_id: auth.user.id,
    vybavila_at: new Date().toISOString(),
    poznamka_mzdarka: poznamka_mzdarka || null,
  }).eq('id', ziadostId)

  await admin.from('notifikacie').insert({
    user_id: z.user_id,
    typ: 'dochadzka_ziadost',
    nadpis: 'Žiadosť o korekciu schválená',
    sprava: `Vaša žiadosť o korekciu ${z.datum} bola schválená.`,
    link: '/dochadzka-prehled',
  })

  // Zruší schválenie hodín pre tento mesiac
  await admin.from('dochadzka_schvalene_hodiny').delete()
    .eq('user_id', z.user_id).eq('mesiac', z.datum.slice(0, 7))

  await logAudit('ziadost_schvalena', 'dochadzka_korekcia_ziadosti', ziadostId, {})

  revalidatePath('/admin/dochadzka/ziadosti')
  revalidatePath(`/admin/dochadzka/${z.user_id}`)
}

export async function zamietnutZiadost(ziadostId: string, dovod: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth
  if (!dovod?.trim()) return { error: 'Dôvod je povinný' }

  const admin = createSupabaseAdmin()
  const { data: z } = await admin.from('dochadzka_korekcia_ziadosti').select('user_id, datum').eq('id', ziadostId).single<{ user_id: string; datum: string }>()

  await admin.from('dochadzka_korekcia_ziadosti').update({
    stav: 'zamietnuta',
    vybavila_id: auth.user.id,
    vybavila_at: new Date().toISOString(),
    poznamka_mzdarka: dovod,
  }).eq('id', ziadostId)

  if (z) {
    await admin.from('notifikacie').insert({
      user_id: z.user_id,
      typ: 'dochadzka_ziadost',
      nadpis: 'Žiadosť o korekciu zamietnutá',
      sprava: `Vaša žiadosť ${z.datum} bola zamietnutá. Dôvod: ${dovod}`,
      link: '/dochadzka-prehled',
    })
  }

  await logAudit('ziadost_zamietnuta', 'dochadzka_korekcia_ziadosti', ziadostId, { dovod })

  revalidatePath('/admin/dochadzka/ziadosti')
}
