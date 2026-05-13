'use server'

import { revalidatePath, updateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireFinOrAdmin, requireAuth } from '@/lib/auth-helpers'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { getAccessibleFirmaIds } from '@/lib/firma-scope'
import { resolveSchvalovatel, getEcbKurz, getDefaultFirmaForUser, computeDphFromAny } from '@/lib/faktury-helpers'
import { getCachedFaktury } from '@/lib/cached-pages'
import { logAudit } from './audit'
import type { FakturaStav, FakturyWorkflowConfig, Mena, Faktura } from '@/lib/faktury-types'
import { SECURITY_FIELDS } from '@/lib/faktury-types'

function refresh() { updateTag('faktury'); updateTag('dashboard') }

/**
 * Overí, že daná firma je v scope volajúceho. Vracia null ak OK, error string ak nie.
 * Zabraňuje IDOR — fin_manager firmy A nemôže manipulovať faktúru firmy B.
 * it_admin vždy prejde.
 */
async function assertFakturaScope(
  firmaId: string | null | undefined,
  userId: string,
  role: string,
): Promise<string | null> {
  if (role === 'it_admin') return null
  if (!firmaId) return 'Faktúra nemá priradenú firmu'
  const accessible = await getAccessibleFirmaIds(userId)
  if (accessible !== null && !accessible.includes(firmaId)) {
    return 'Faktúra je mimo vášho scope'
  }
  return null
}

async function notify(userId: string, typ: string, nadpis: string, sprava: string, link?: string) {
  if (!userId) return
  const admin = createSupabaseAdmin()
  await admin.from('notifikacie').insert({ user_id: userId, typ, nadpis, sprava, link: link || null })
}

async function getFirmaWorkflow(firmaId: string): Promise<FakturyWorkflowConfig> {
  const admin = createSupabaseAdmin()
  const { data } = await admin.from('firmy').select('faktury_workflow').eq('id', firmaId).maybeSingle()
  return (data?.faktury_workflow as FakturyWorkflowConfig) || {
    stupne: 1, limit_auto_eur: 0,
    schvalovatel_l1: 'fin_manager', schvalovatel_l2: 'admin', uhradzuje: 'fin_manager',
  }
}

// ─── CREATE ─────────────────────────────────────────────────────────
export async function createFaktura(formData: FormData) {
  const auth = await requireFinOrAdmin()
  if ('error' in auth) return { error: auth.error }

  const file = formData.get('file') as File
  if (!file || file.size === 0) return { error: 'Žiadny súbor' }
  if (file.size > 25 * 1024 * 1024) return { error: 'Súbor je príliš veľký (max 25MB)' }
  const allowedMime = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
  if (!allowedMime.includes(file.type)) return { error: 'Nepodporovaný typ súboru' }

  const admin = createSupabaseAdmin()
  const firmaId = (formData.get('firma_id') as string) || (await getDefaultFirmaForUser(auth.user.id))
  if (!firmaId) return { error: 'Nemáte priradenú firmu' }

  const jeDobropis = formData.get('je_dobropis') === 'true'
  const povodnaFakturaId = (formData.get('povodna_faktura_id') as string) || null
  if (jeDobropis && !povodnaFakturaId) return { error: 'Dobropis vyžaduje povodna_faktura_id' }
  if (!jeDobropis && povodnaFakturaId) return { error: 'Bežná faktúra nesmie mať povodna_faktura_id' }

  const dphSadzba = parseFloat((formData.get('dph_sadzba') as string) || '20')
  const computed = computeDphFromAny({
    suma_bez_dph: formData.get('suma_bez_dph') ? parseFloat(formData.get('suma_bez_dph') as string) : null,
    dph_suma: formData.get('dph_suma') ? parseFloat(formData.get('dph_suma') as string) : null,
    suma_celkom: formData.get('suma_celkom') ? parseFloat(formData.get('suma_celkom') as string) : null,
    dph_sadzba: dphSadzba,
  })
  let suma_celkom = computed.suma_celkom
  if (jeDobropis) suma_celkom = -Math.abs(suma_celkom)
  else suma_celkom = Math.abs(suma_celkom)
  if (suma_celkom === 0) return { error: 'Suma nemôže byť 0' }

  const mena = (formData.get('mena') as Mena) || 'EUR'
  let kurz_k_eur: number | null = null
  let kurz_zdroj: 'ECB' | 'manual' | null = null
  let kurz_datum: string | null = null
  if (mena !== 'EUR') {
    const datumDoruceni = (formData.get('datum_doruceni') as string) || new Date().toISOString().split('T')[0]
    const ecb = await getEcbKurz(mena, datumDoruceni)
    if (ecb) {
      kurz_k_eur = ecb.kurz
      kurz_zdroj = ecb.zdroj
      kurz_datum = ecb.datum
    } else if (formData.get('kurz_k_eur')) {
      kurz_k_eur = parseFloat(formData.get('kurz_k_eur') as string)
      kurz_zdroj = 'manual'
      kurz_datum = datumDoruceni
    } else {
      return { error: `Nepodarilo sa získať kurz pre ${mena}, zadajte manuálne` }
    }
  }

  // Upload súboru
  const ext = file.name.split('.').pop() || 'pdf'
  const now = new Date()
  const filePath = `${firmaId}/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${crypto.randomUUID()}.${ext}`
  const { error: uploadErr } = await admin.storage.from('faktury').upload(filePath, file, {
    contentType: file.type, upsert: false,
  })
  if (uploadErr) return { error: 'Chyba pri nahrávaní súboru: ' + uploadErr.message }

  // Resolve dodavatel snapshot
  let dodavatelNazov = (formData.get('dodavatel_nazov') as string) || ''
  let dodavatelIco: string | null = null
  const dodavatelId = (formData.get('dodavatel_id') as string) || null
  if (dodavatelId) {
    const { data: d } = await admin.from('dodavatelia').select('nazov, ico').eq('id', dodavatelId).maybeSingle()
    if (d) {
      dodavatelNazov = d.nazov
      dodavatelIco = d.ico
    }
  }
  if (!dodavatelNazov) return { error: 'Dodávateľ je povinný' }

  const tagy = (formData.get('tagy') as string || '').split(',').map(t => t.trim()).filter(Boolean)

  const { data: faktura, error } = await admin.from('faktury').insert({
    cislo_faktury: formData.get('cislo_faktury') as string,
    variabilny_symbol: (formData.get('variabilny_symbol') as string) || null,
    konstantny_symbol: (formData.get('konstantny_symbol') as string) || null,
    specificky_symbol: (formData.get('specificky_symbol') as string) || null,
    je_dobropis: jeDobropis,
    povodna_faktura_id: povodnaFakturaId,

    dodavatel_id: dodavatelId,
    dodavatel_nazov: dodavatelNazov,
    dodavatel_ico: dodavatelIco,

    mena, suma_bez_dph: jeDobropis ? -Math.abs(computed.suma_bez_dph) : computed.suma_bez_dph,
    dph_sadzba: dphSadzba,
    dph_suma: jeDobropis ? -Math.abs(computed.dph_suma) : computed.dph_suma,
    suma_celkom,
    kurz_k_eur, kurz_zdroj, kurz_datum,

    iban: (formData.get('iban') as string) || null,

    datum_vystavenia: (formData.get('datum_vystavenia') as string) || null,
    datum_doruceni: (formData.get('datum_doruceni') as string) || null,
    datum_splatnosti: formData.get('datum_splatnosti') as string,
    datum_zdanitelneho_plnenia: (formData.get('datum_zdanitelneho_plnenia') as string) || null,

    stav: 'rozpracovana' as FakturaStav,
    aktualny_stupen: 1,

    file_path: filePath,
    file_name: file.name,
    file_size: file.size,
    mime_type: file.type,

    firma_id: firmaId,
    vozidlo_id: (formData.get('vozidlo_id') as string) || null,
    servis_id: (formData.get('servis_id') as string) || null,
    tankova_karta_id: (formData.get('tankova_karta_id') as string) || null,
    cesta_id: (formData.get('cesta_id') as string) || null,
    zamestnanec_id: (formData.get('zamestnanec_id') as string) || null,
    skolenie_id: (formData.get('skolenie_id') as string) || null,
    poistna_udalost_id: (formData.get('poistna_udalost_id') as string) || null,
    bankovy_ucet_id: (formData.get('bankovy_ucet_id') as string) || null,
    kategoria_id: (formData.get('kategoria_id') as string) || null,

    popis: (formData.get('popis') as string) || null,
    poznamka: (formData.get('poznamka') as string) || null,
    oddelenie: (formData.get('oddelenie') as string) || null,
    tagy: tagy.length > 0 ? tagy : null,

    nahral_id: auth.user.id,
  }).select('id').single()

  if (error || !faktura) {
    // Cleanup uploaded file
    await admin.storage.from('faktury').remove([filePath])
    return { error: 'Chyba pri vytváraní faktúry: ' + (error?.message || 'neznáma chyba') }
  }

  await logAudit('faktura_create', 'faktury', faktura.id)
  refresh()

  // Auto-poslať na schválenie ak je tak nastavené
  if (formData.get('action') === 'send') {
    return sendForApproval(faktura.id)
  }
  return { data: { id: faktura.id } }
}

// ─── SEND FOR APPROVAL ──────────────────────────────────────────────
export async function sendForApproval(id: string) {
  const auth = await requireFinOrAdmin()
  if ('error' in auth) return { error: auth.error }
  const admin = createSupabaseAdmin()

  const { data: f } = await admin.from('faktury')
    .select('id, stav, firma_id, nahral_id, suma_celkom_eur, version, cislo_faktury, dodavatel_nazov')
    .eq('id', id).maybeSingle()
  if (!f) return { error: 'Faktúra nenájdená' }
  const scopeErr = await assertFakturaScope(f.firma_id, auth.user.id, auth.profile.role)
  if (scopeErr) return { error: scopeErr }
  if (f.stav !== 'rozpracovana' && f.stav !== 'zamietnuta') {
    return { error: `Nedá sa poslať na schválenie zo stavu ${f.stav}` }
  }

  const config = await getFirmaWorkflow(f.firma_id)
  const schvalovatelId = await resolveSchvalovatel(f.nahral_id, f.firma_id, config, 1)

  const { error } = await admin.from('faktury').update({
    stav: 'caka_na_schvalenie',
    aktualny_stupen: 1,
    posol_na_schvalenie_at: new Date().toISOString(),
    schvalil_l1_id: null, schvalene_l1_at: null,
    schvalil_l2_id: null, schvalene_l2_at: null,
    zamietol_id: null, zamietnute_at: null, zamietnutie_dovod: null,
  }).eq('id', id).eq('version', f.version)

  if (error) return { error: 'Chyba pri odoslaní: ' + error.message }

  if (schvalovatelId) {
    await notify(schvalovatelId, 'faktura_podana',
      'Faktúra na schválenie',
      `${f.cislo_faktury} · ${f.dodavatel_nazov} · ${f.suma_celkom_eur} EUR`,
      `/admin/faktury/${id}`)
  }
  refresh()
  return { data: { id } }
}

// ─── APPROVE ────────────────────────────────────────────────────────
export async function approveFaktura(id: string, expectedVersion: number) {
  const auth = await requireFinOrAdmin()
  if ('error' in auth) return { error: auth.error }
  const admin = createSupabaseAdmin()

  const { data: f } = await admin.from('faktury')
    .select('id, stav, firma_id, nahral_id, suma_celkom_eur, aktualny_stupen, version, cislo_faktury, dodavatel_nazov, schvalil_l1_id')
    .eq('id', id).maybeSingle()
  if (!f) return { error: 'Faktúra nenájdená' }
  const scopeErr = await assertFakturaScope(f.firma_id, auth.user.id, auth.profile.role)
  if (scopeErr) return { error: scopeErr }
  if (f.stav !== 'caka_na_schvalenie') return { error: 'Faktúra nie je v stave čaká na schválenie' }
  if (f.version !== expectedVersion) return { error: 'Faktúra bola medzitým zmenená — refresh a skús znovu' }

  // Konflikt záujmov check
  if (f.nahral_id === auth.user.id) return { error: 'Nemôžete schváliť vlastnú faktúru' }

  const config = await getFirmaWorkflow(f.firma_id)
  const expectedSchvalovatel = await resolveSchvalovatel(f.nahral_id, f.firma_id, config, f.aktualny_stupen as 1 | 2)
  // Soft check — fin_manager / admin / it_admin smie schváliť (RLS sa stará o firma scope)

  const now = new Date().toISOString()
  const stupen = f.aktualny_stupen
  const sumaEur = Math.abs(Number(f.suma_celkom_eur || 0))
  const updates: Record<string, unknown> = {}

  if (stupen === 1) {
    updates.schvalil_l1_id = auth.user.id
    updates.schvalene_l1_at = now
    if (config.stupne === 1 || sumaEur <= config.limit_auto_eur) {
      updates.stav = 'schvalena'
      updates.aktualny_stupen = 1
    } else {
      updates.stav = 'caka_na_schvalenie'
      updates.aktualny_stupen = 2
    }
  } else {
    updates.schvalil_l2_id = auth.user.id
    updates.schvalene_l2_at = now
    updates.stav = 'schvalena'
  }

  const { error } = await admin.from('faktury').update(updates).eq('id', id).eq('version', expectedVersion)
  if (error) return { error: 'Chyba pri schválení: ' + error.message }

  if (updates.stav === 'schvalena') {
    await notify(f.nahral_id, 'faktura_schvalena', 'Faktúra schválená',
      `${f.cislo_faktury} · ${f.dodavatel_nazov}`, `/admin/faktury/${id}`)
    // Notif uhradzujúcemu
    const uhradzujeId = await resolveSchvalovatel(f.nahral_id, f.firma_id, { ...config, schvalovatel_l1: config.uhradzuje } as FakturyWorkflowConfig, 1)
    if (uhradzujeId && uhradzujeId !== f.nahral_id) {
      await notify(uhradzujeId, 'faktura_na_uhradu', 'Faktúra pripravená na úhradu',
        `${f.cislo_faktury} · ${f.dodavatel_nazov}`, `/admin/faktury/${id}`)
    }
  } else if (updates.stav === 'caka_na_schvalenie' && updates.aktualny_stupen === 2) {
    const l2Id = await resolveSchvalovatel(f.nahral_id, f.firma_id, config, 2)
    if (l2Id) {
      await notify(l2Id, 'faktura_l2', 'Faktúra čaká na L2 schválenie',
        `${f.cislo_faktury} · suma ${sumaEur.toFixed(2)} EUR (nad limit ${config.limit_auto_eur} EUR)`, `/admin/faktury/${id}`)
    }
  }

  await logAudit('faktura_approve', 'faktury', id, { stupen })
  refresh()
  return { data: { id, stav: updates.stav } }
}

// ─── REJECT ─────────────────────────────────────────────────────────
export async function rejectFaktura(id: string, dovod: string, expectedVersion: number) {
  const auth = await requireFinOrAdmin()
  if ('error' in auth) return { error: auth.error }
  if (!dovod.trim()) return { error: 'Dôvod je povinný' }
  const admin = createSupabaseAdmin()

  const { data: f } = await admin.from('faktury').select('id, stav, firma_id, version, nahral_id, cislo_faktury, dodavatel_nazov').eq('id', id).maybeSingle()
  if (!f) return { error: 'Faktúra nenájdená' }
  const scopeErr = await assertFakturaScope(f.firma_id, auth.user.id, auth.profile.role)
  if (scopeErr) return { error: scopeErr }
  if (f.stav !== 'caka_na_schvalenie') return { error: 'Faktúra nie je v stave čaká na schválenie' }
  if (f.version !== expectedVersion) return { error: 'Faktúra bola medzitým zmenená — refresh' }

  const { error } = await admin.from('faktury').update({
    stav: 'zamietnuta',
    zamietol_id: auth.user.id,
    zamietnute_at: new Date().toISOString(),
    zamietnutie_dovod: dovod.trim(),
  }).eq('id', id).eq('version', expectedVersion)
  if (error) return { error: 'Chyba pri zamietnutí: ' + error.message }

  await notify(f.nahral_id, 'faktura_zamietnuta', 'Faktúra zamietnutá',
    `${f.cislo_faktury} · ${f.dodavatel_nazov} · Dôvod: ${dovod}`, `/admin/faktury/${id}`)
  await logAudit('faktura_reject', 'faktury', id, { dovod })
  refresh()
  return { data: { id } }
}

// ─── MARK FOR PAYMENT / MARK PAID ───────────────────────────────────
export async function markForPayment(id: string, expectedVersion: number) {
  const auth = await requireFinOrAdmin()
  if ('error' in auth) return { error: auth.error }
  const admin = createSupabaseAdmin()
  const { data: f } = await admin.from('faktury').select('firma_id').eq('id', id).maybeSingle()
  if (!f) return { error: 'Faktúra nenájdená' }
  const scopeErr = await assertFakturaScope(f.firma_id, auth.user.id, auth.profile.role)
  if (scopeErr) return { error: scopeErr }
  const { error } = await admin.from('faktury').update({ stav: 'na_uhradu' })
    .eq('id', id).eq('version', expectedVersion).eq('stav', 'schvalena')
  if (error) return { error: 'Chyba: ' + error.message }
  await logAudit('faktura_mark_for_payment', 'faktury', id)
  refresh()
  return { data: { id } }
}

export async function markPaid(id: string, datumUhrady: string, bankovyUcetId: string | null, expectedVersion: number) {
  const auth = await requireFinOrAdmin()
  if ('error' in auth) return { error: auth.error }
  if (!datumUhrady) return { error: 'Dátum úhrady je povinný' }
  const admin = createSupabaseAdmin()

  const { data: f } = await admin.from('faktury').select('stav, firma_id, nahral_id, cislo_faktury, dodavatel_nazov').eq('id', id).maybeSingle()
  if (!f) return { error: 'Faktúra nenájdená' }
  const scopeErr = await assertFakturaScope(f.firma_id, auth.user.id, auth.profile.role)
  if (scopeErr) return { error: scopeErr }
  if (!['schvalena', 'na_uhradu'].includes(f.stav)) return { error: 'Faktúra musí byť schválená' }

  const { error } = await admin.from('faktury').update({
    stav: 'uhradena',
    datum_uhrady: datumUhrady,
    bankovy_ucet_id: bankovyUcetId,
    uhradil_id: auth.user.id,
    uhradene_at: new Date().toISOString(),
  }).eq('id', id).eq('version', expectedVersion)
  if (error) return { error: 'Chyba: ' + error.message }

  await notify(f.nahral_id, 'faktura_uhradena', 'Faktúra uhradená',
    `${f.cislo_faktury} · ${f.dodavatel_nazov}`, `/admin/faktury/${id}`)
  await logAudit('faktura_paid', 'faktury', id, { datum_uhrady: datumUhrady })
  refresh()
  return { data: { id } }
}

// ─── CANCEL / FORCE STORNO ──────────────────────────────────────────
export async function cancelFaktura(id: string, dovod: string, expectedVersion: number) {
  const auth = await requireFinOrAdmin()
  if ('error' in auth) return { error: auth.error }
  if (!dovod.trim()) return { error: 'Dôvod storna je povinný' }
  const admin = createSupabaseAdmin()

  const { data: f } = await admin.from('faktury').select('stav, firma_id').eq('id', id).maybeSingle()
  if (!f) return { error: 'Faktúra nenájdená' }
  const scopeErr = await assertFakturaScope(f.firma_id, auth.user.id, auth.profile.role)
  if (scopeErr) return { error: scopeErr }
  if (f.stav === 'uhradena') return { error: 'Storno uhradenej faktúry — použite forceStornoUhradenej (it_admin) alebo dobropis' }
  if (f.stav === 'stornovana') return { error: 'Faktúra je už stornovaná' }

  const { error } = await admin.from('faktury').update({
    stav: 'stornovana',
    stornoval_id: auth.user.id,
    stornovane_at: new Date().toISOString(),
    storno_dovod: dovod.trim(),
  }).eq('id', id).eq('version', expectedVersion)
  if (error) return { error: 'Chyba: ' + error.message }

  await logAudit('faktura_cancel', 'faktury', id, { dovod })
  refresh()
  return { data: { id } }
}

export async function forceStornoUhradenej(id: string, dovod: string, expectedVersion: number) {
  const auth = await requireAuth()
  if ('error' in auth) return { error: auth.error }
  if (auth.profile.role !== 'it_admin') return { error: 'Iba it_admin môže force storno uhradenej' }
  if (!dovod.trim()) return { error: 'Dôvod je povinný' }
  const admin = createSupabaseAdmin()

  const { data: f } = await admin.from('faktury').select('stav, firma_id, cislo_faktury').eq('id', id).maybeSingle()
  if (!f) return { error: 'Faktúra nenájdená' }
  if (f.stav !== 'uhradena') return { error: 'Force storno len pre uhradenú' }

  const { error } = await admin.from('faktury').update({
    stav: 'stornovana',
    stornoval_id: auth.user.id,
    stornovane_at: new Date().toISOString(),
    storno_dovod: 'FORCE STORNO UHRADENEJ: ' + dovod.trim(),
  }).eq('id', id).eq('version', expectedVersion)
  if (error) return { error: 'Chyba: ' + error.message }

  // Notify fin_manageru a admina firmy
  const { data: managers } = await admin.from('profiles').select('id')
    .in('role', ['admin', 'fin_manager'])
    .or(`firma_id.eq.${f.firma_id},pristupne_firmy.cs.{${f.firma_id}}`)
  for (const m of managers || []) {
    await notify(m.id, 'faktura_force_storno', 'POZOR: Force storno uhradenej faktúry',
      `${f.cislo_faktury} · Dôvod: ${dovod}`, `/admin/faktury/${id}`)
  }
  await logAudit('faktura_force_storno', 'faktury', id, { dovod })
  refresh()
  return { data: { id } }
}

// ─── RE-APPROVAL pri editácii security poľa ─────────────────────────
export async function updateFaktura(id: string, data: Partial<Faktura>, expectedVersion: number) {
  const auth = await requireFinOrAdmin()
  if ('error' in auth) return { error: auth.error }
  const admin = createSupabaseAdmin()

  const { data: f } = await admin.from('faktury').select('*').eq('id', id).maybeSingle()
  if (!f) return { error: 'Faktúra nenájdená' }
  const scopeErr = await assertFakturaScope(f.firma_id, auth.user.id, auth.profile.role)
  if (scopeErr) return { error: scopeErr }
  if (f.version !== expectedVersion) return { error: 'Faktúra bola zmenená — refresh' }
  if (['uhradena', 'stornovana'].includes(f.stav)) return { error: 'Uzamknutá faktúra sa nedá editovať (storno alebo dobropis)' }

  // Detekuj security changes
  const securityChanged = SECURITY_FIELDS.some(field => field in data && (f as Record<string, unknown>)[field] !== (data as Record<string, unknown>)[field])
  const updates: Record<string, unknown> = { ...data }

  if (securityChanged && ['schvalena', 'na_uhradu'].includes(f.stav)) {
    // Re-approval
    updates.stav = 'caka_na_schvalenie'
    updates.aktualny_stupen = 1
    updates.schvalil_l1_id = null
    updates.schvalene_l1_at = null
    updates.schvalil_l2_id = null
    updates.schvalene_l2_at = null
    updates.posol_na_schvalenie_at = new Date().toISOString()
  }

  const { error } = await admin.from('faktury').update(updates).eq('id', id).eq('version', expectedVersion)
  if (error) return { error: 'Chyba: ' + error.message }

  await logAudit(securityChanged ? 'faktura_edit_security' : 'faktura_edit_metadata', 'faktury', id, { fields: Object.keys(data) })
  refresh()
  return { data: { id, reapproval: securityChanged } }
}

// ─── BULK ───────────────────────────────────────────────────────────
export async function bulkApprove(ids: string[]) {
  const auth = await requireFinOrAdmin()
  if ('error' in auth) return { error: auth.error }
  const admin = createSupabaseAdmin()

  const results: Array<{ id: string; ok: boolean; error?: string }> = []
  for (const id of ids) {
    const { data: f } = await admin.from('faktury').select('version').eq('id', id).maybeSingle()
    if (!f) { results.push({ id, ok: false, error: 'not found' }); continue }
    const r = await approveFaktura(id, f.version)
    results.push({ id, ok: !('error' in r), error: 'error' in r ? r.error : undefined })
  }
  refresh()
  return { data: results }
}

// ─── DOBROPIS ───────────────────────────────────────────────────────
export async function createCreditNote(povodnaFakturaId: string, formData: FormData) {
  const auth = await requireFinOrAdmin()
  if ('error' in auth) return { error: auth.error }
  const admin = createSupabaseAdmin()

  const { data: povodna } = await admin.from('faktury').select('*').eq('id', povodnaFakturaId).maybeSingle()
  if (!povodna) return { error: 'Pôvodná faktúra nenájdená' }
  const scopeErr = await assertFakturaScope(povodna.firma_id, auth.user.id, auth.profile.role)
  if (scopeErr) return { error: scopeErr }
  if (povodna.je_dobropis) return { error: 'Dobropis pre dobropis nie je povolený' }

  // Pre-fill z pôvodnej faktúry
  formData.set('je_dobropis', 'true')
  formData.set('povodna_faktura_id', povodnaFakturaId)
  formData.set('firma_id', povodna.firma_id)
  formData.set('dodavatel_id', povodna.dodavatel_id || '')
  formData.set('dodavatel_nazov', povodna.dodavatel_nazov)
  if (!formData.get('mena')) formData.set('mena', povodna.mena)
  if (!formData.get('dph_sadzba')) formData.set('dph_sadzba', String(povodna.dph_sadzba))

  return createFaktura(formData)
}

// ─── READ ───────────────────────────────────────────────────────────
export async function getFakturyList(filter?: {
  stav?: FakturaStav | 'all'; firma_id?: string; mesiac?: string; overdue?: boolean
  vozidlo_id?: string; servis_id?: string; cesta_id?: string; zamestnanec_id?: string
  tankova_karta_id?: string; skolenie_id?: string; poistna_udalost_id?: string
  dodavatel_id?: string
}) {
  const auth = await requireFinOrAdmin()
  if ('error' in auth) return { error: auth.error, data: [] }

  // Cached read — všetky faktúry naraz, filter na klientovi
  const all = await getCachedFaktury() as Array<Faktura & { firma_id: string }>
  const today = new Date().toISOString().split('T')[0]

  // Aplikuj filtre
  let filtered = all
  if (filter?.stav && filter.stav !== 'all') filtered = filtered.filter(f => f.stav === filter.stav)
  if (filter?.firma_id) filtered = filtered.filter(f => f.firma_id === filter.firma_id)
  if (filter?.vozidlo_id) filtered = filtered.filter(f => f.vozidlo_id === filter.vozidlo_id)
  if (filter?.servis_id) filtered = filtered.filter(f => f.servis_id === filter.servis_id)
  if (filter?.cesta_id) filtered = filtered.filter(f => f.cesta_id === filter.cesta_id)
  if (filter?.zamestnanec_id) filtered = filtered.filter(f => f.zamestnanec_id === filter.zamestnanec_id)
  if (filter?.tankova_karta_id) filtered = filtered.filter(f => f.tankova_karta_id === filter.tankova_karta_id)
  if (filter?.skolenie_id) filtered = filtered.filter(f => f.skolenie_id === filter.skolenie_id)
  if (filter?.poistna_udalost_id) filtered = filtered.filter(f => f.poistna_udalost_id === filter.poistna_udalost_id)
  if (filter?.dodavatel_id) filtered = filtered.filter(f => f.dodavatel_id === filter.dodavatel_id)
  if (filter?.overdue) filtered = filtered.filter(f => f.datum_splatnosti < today && ['schvalena', 'na_uhradu'].includes(f.stav))
  if (filter?.mesiac) filtered = filtered.filter(f => f.datum_splatnosti.startsWith(filter.mesiac!))

  // Firma scope
  if (auth.profile.role !== 'it_admin') {
    const accessibleFirmaIds = [auth.profile.firma_id, ...((auth.profile.pristupne_firmy as string[] | null) || [])].filter(Boolean) as string[]
    filtered = filtered.filter(f => accessibleFirmaIds.includes(f.firma_id))
  }

  return { data: filtered }
}

export async function getFakturaDetail(id: string) {
  const auth = await requireFinOrAdmin()
  if ('error' in auth) return { error: auth.error }
  const admin = createSupabaseAdmin()

  const [fakturaRes, auditRes, dobropisyRes] = await Promise.all([
    admin.from('faktury').select(`*,
      dodavatel:dodavatelia(*),
      firma:firmy(id,kod,nazov,faktury_workflow),
      vozidlo:vozidla(id,spz,znacka,model),
      cesta:sluzobne_cesty(id,cislo,ucel),
      nahral:profiles!nahral_id(id,full_name),
      schvalil_l1:profiles!schvalil_l1_id(id,full_name),
      schvalil_l2:profiles!schvalil_l2_id(id,full_name),
      uhradil:profiles!uhradil_id(id,full_name),
      bankovy_ucet:bankove_ucty(*)
    `).eq('id', id).maybeSingle(),
    admin.from('faktury_audit_log').select('*, user:profiles(full_name)').eq('faktura_id', id).order('created_at', { ascending: false }).limit(50),
    admin.from('faktury').select('id,cislo_faktury,suma_celkom,suma_celkom_eur,mena,stav,created_at').eq('povodna_faktura_id', id).order('created_at'),
  ])

  if (fakturaRes.error || !fakturaRes.data) return { error: fakturaRes.error?.message || 'nenájdené' }

  const scopeErr = await assertFakturaScope(fakturaRes.data.firma_id, auth.user.id, auth.profile.role)
  if (scopeErr) return { error: scopeErr }

  // Storage signed URL
  const { data: signed } = await admin.storage.from('faktury').createSignedUrl(fakturaRes.data.file_path, 900)

  return {
    data: {
      faktura: fakturaRes.data,
      audit: auditRes.data || [],
      dobropisy: dobropisyRes.data || [],
      file_url: signed?.signedUrl || null,
    },
  }
}

export async function getCashflowForecast(mesiacOd: string, mesiacDo: string) {
  const auth = await requireFinOrAdmin()
  if ('error' in auth) return { error: auth.error, data: [] }
  const admin = createSupabaseAdmin()

  const { data } = await admin.from('faktury')
    .select('datum_splatnosti, suma_celkom_eur, firma_id, stav')
    .gte('datum_splatnosti', `${mesiacOd}-01`)
    .lte('datum_splatnosti', `${mesiacDo}-31`)
    .in('stav', ['schvalena', 'na_uhradu'])

  const accessible = auth.profile.role === 'it_admin' ? null
    : [auth.profile.firma_id, ...((auth.profile.pristupne_firmy as string[] | null) || [])].filter(Boolean) as string[]
  const filtered = (data || []).filter(f => accessible === null || accessible.includes(f.firma_id))

  const byMonth = new Map<string, number>()
  for (const f of filtered) {
    const m = f.datum_splatnosti.slice(0, 7)
    byMonth.set(m, (byMonth.get(m) || 0) + Math.abs(Number(f.suma_celkom_eur || 0)))
  }
  return { data: Array.from(byMonth.entries()).map(([mesiac, suma]) => ({ mesiac, suma })).sort((a, b) => a.mesiac.localeCompare(b.mesiac)) }
}
