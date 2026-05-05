'use server'

import { requireAdmin } from '@/lib/auth-helpers'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { revalidatePath, updateTag } from 'next/cache'
import { logAudit } from './audit'

export async function spustitKontrolu(firmaId: string, mesiac: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const admin = createSupabaseAdmin()
  const { error } = await admin.from('dochadzka_uzavierka').upsert({
    firma_id: firmaId,
    mesiac,
    stav: 'na_kontrolu',
    na_kontrolu_at: new Date().toISOString(),
    na_kontrolu_by: auth.user.id,
  }, { onConflict: 'firma_id,mesiac' })

  if (error) return { error: error.message }

  await logAudit('uzavierka_kontrola', 'dochadzka_uzavierka', firmaId, { mesiac })

  // Notifikuj všetkých zamestnancov firmy že mesiac je v kontrole
  const { data: zamestnanci } = await admin
    .from('profiles').select('id').eq('firma_id', firmaId).eq('active', true)
  for (const z of zamestnanci || []) {
    await admin.from('notifikacie').insert({
      user_id: z.id,
      typ: 'dochadzka_uzavierka_pripravena',
      nadpis: 'Mesiac sa pripravuje na uzavretie',
      sprava: `Mesiac ${mesiac} je v kontrole. Skontrolujte si svoju dochádzku — neskôr nebudú možné úpravy.`,
      link: '/dochadzka-prehled',
    })
  }

  revalidatePath('/admin/dochadzka')
  revalidatePath('/admin/dochadzka/uzavierka'); updateTag('dochadzka')
}

export async function uzavrietMesiac(firmaId: string, mesiac: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const admin = createSupabaseAdmin()
  const { error } = await admin.from('dochadzka_uzavierka').upsert({
    firma_id: firmaId,
    mesiac,
    stav: 'uzavrety',
    uzavrety_at: new Date().toISOString(),
    uzavrety_by: auth.user.id,
  }, { onConflict: 'firma_id,mesiac' })

  if (error) return { error: error.message }
  await logAudit('uzavierka_uzavrety', 'dochadzka_uzavierka', firmaId, { mesiac })

  revalidatePath('/admin/dochadzka')
  revalidatePath('/admin/dochadzka/uzavierka'); updateTag('dochadzka')
}

export async function prelomitUzavierku(firmaId: string, mesiac: string, dovod: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth
  if (auth.profile.role !== 'it_admin') return { error: 'Iba IT admin môže prelomiť uzávierku' }
  if (!dovod?.trim()) return { error: 'Dôvod je povinný' }

  const admin = createSupabaseAdmin()
  const { error } = await admin.from('dochadzka_uzavierka').update({
    stav: 'otvoreny',
    prelomenie_dovod: dovod,
    prelomil_id: auth.user.id,
    prelomil_at: new Date().toISOString(),
  }).eq('firma_id', firmaId).eq('mesiac', mesiac)

  if (error) return { error: error.message }
  await logAudit('uzavierka_prelomenie', 'dochadzka_uzavierka', firmaId, { mesiac, dovod })

  revalidatePath('/admin/dochadzka')
  revalidatePath('/admin/dochadzka/uzavierka'); updateTag('dochadzka')
}

export async function schvalitHodinyZamestnanca(userId: string, mesiac: string, poznamka?: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const admin = createSupabaseAdmin()
  const { error } = await admin.from('dochadzka_schvalene_hodiny').upsert({
    user_id: userId,
    mesiac,
    schvaleny_by: auth.user.id,
    schvaleny_at: new Date().toISOString(),
    poznamka: poznamka || null,
  }, { onConflict: 'user_id,mesiac' })

  if (error) return { error: error.message }
  await logAudit('schvalenie_hodin', 'dochadzka_schvalene_hodiny', userId, { mesiac })

  await admin.from('notifikacie').insert({
    user_id: userId,
    typ: 'dochadzka_schvalene',
    nadpis: 'Hodiny schválené',
    sprava: `Vaše hodiny za ${mesiac} sú schválené mzdárkou.`,
    link: '/dochadzka-prehled',
  })

  revalidatePath(`/admin/dochadzka/${userId}`)
  revalidatePath('/admin/dochadzka')
}

export async function zrusitSchvalenie(userId: string, mesiac: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const admin = createSupabaseAdmin()
  const { error } = await admin.from('dochadzka_schvalene_hodiny').delete()
    .eq('user_id', userId).eq('mesiac', mesiac)

  if (error) return { error: error.message }
  await logAudit('zrusenie_schvalenia', 'dochadzka_schvalene_hodiny', userId, { mesiac })

  revalidatePath(`/admin/dochadzka/${userId}`)
}

export async function bulkSchvalitFirmu(firmaId: string, mesiac: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const admin = createSupabaseAdmin()
  const { data: zamestnanci } = await admin
    .from('profiles').select('id')
    .eq('firma_id', firmaId).eq('active', true)

  const inserts = (zamestnanci || []).map(z => ({
    user_id: z.id,
    mesiac,
    schvaleny_by: auth.user.id,
    schvaleny_at: new Date().toISOString(),
  }))

  if (inserts.length === 0) return { count: 0 }

  const { error } = await admin.from('dochadzka_schvalene_hodiny').upsert(inserts, { onConflict: 'user_id,mesiac' })
  if (error) return { error: error.message }

  await logAudit('bulk_schvalenie_firmy', 'dochadzka_schvalene_hodiny', firmaId, { mesiac, pocet: inserts.length })

  revalidatePath('/admin/dochadzka')
  return { count: inserts.length }
}
