'use server'

import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin, requireScopedAdmin } from '@/lib/auth-helpers'
import { revalidatePath, updateTag } from 'next/cache'

function revalidateZamestnanci() { updateTag('zamestnanci'); updateTag('dashboard') }
import { logAudit } from './audit'

// createZamestnanec si necháva requireAdmin — nový užívateľ ešte nemá firmu,
// scope check by zlyhal. Onboarding flow: createZamestnanec → updateZamestnanecFirma
// (scope check pri firma-priraďovaní je v updateZamestnanecFirma nižšie).
export async function createZamestnanec(formData: FormData) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const email = formData.get('email') as string
  const full_name = formData.get('full_name') as string
  const vozidlo_id = formData.get('vozidlo_id') as string || null
  const password = formData.get('password') as string
  const role = formData.get('role') as string || 'zamestnanec'

  const adminClient = createSupabaseAdmin()

  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role },
  })

  if (authError) return { error: `Chyba pri vytváraní účtu: ${authError.message}` }
  if (!authData.user) return { error: 'Účet sa nepodarilo vytvoriť' }

  const updates: Record<string, unknown> = {}
  if (vozidlo_id) updates.vozidlo_id = vozidlo_id
  if (role !== 'zamestnanec') updates.role = role

  if (Object.keys(updates).length > 0) {
    await adminClient.from('profiles').update(updates).eq('id', authData.user.id)
  }

  await logAudit('vytvorenie_zamestnanca', 'profiles', authData.user.id, { email, full_name, role })

  revalidatePath('/admin/zamestnanci'); revalidateZamestnanci()
  return { success: true }
}

export async function deleteZamestnanec(profileId: string) {
  const auth = await requireScopedAdmin(profileId)
  if ('error' in auth) return auth

  const adminClient = createSupabaseAdmin()
  const { data: profile } = await adminClient.from('profiles').select('email, full_name').eq('id', profileId).single()

  const { error } = await adminClient.auth.admin.deleteUser(profileId)
  if (error) return { error: `Chyba pri mazaní účtu: ${error.message}` }

  await logAudit('zmazanie_zamestnanca', 'profiles', profileId, { email: profile?.email, full_name: profile?.full_name })

  revalidatePath('/admin/zamestnanci'); revalidateZamestnanci()
  return { success: true }
}

export async function updateZamestnanecVozidlo(profileId: string, vozidloId: string | null) {
  const auth = await requireScopedAdmin(profileId)
  if ('error' in auth) return auth

  const adminClient = createSupabaseAdmin()
  const { error } = await adminClient.from('profiles').update({ vozidlo_id: vozidloId }).eq('id', profileId)
  if (error) return { error: 'Chyba pri priraďovaní vozidla' }
  revalidatePath('/admin/zamestnanci'); revalidateZamestnanci()
}

export async function toggleZamestnanecActive(profileId: string, active: boolean) {
  const auth = await requireScopedAdmin(profileId)
  if ('error' in auth) return auth

  const adminClient = createSupabaseAdmin()
  const { error } = await adminClient.from('profiles').update({ active }).eq('id', profileId)
  if (error) return { error: 'Chyba pri zmene stavu' }

  // Pri deaktivácii automaticky zamietnuť pending žiadosti, aby nezostali visieť
  if (!active) {
    const now = new Date().toISOString()

    await adminClient.from('dovolenky')
      .update({
        stav: 'zamietnuta',
        dovod_zamietnutia: 'Automatické zamietnutie — zamestnanec deaktivovaný',
        schvalene_at: now,
      })
      .eq('user_id', profileId)
      .eq('stav', 'caka_na_schvalenie')

    await adminClient.from('sluzobne_cesty')
      .update({
        stav: 'zamietnuta',
        schvalene_at: now,
      })
      .eq('user_id', profileId)
      .eq('stav', 'nova')
  }

  await logAudit(active ? 'aktivacia_zamestnanca' : 'deaktivacia_zamestnanca', 'profiles', profileId)

  revalidatePath('/admin/zamestnanci'); revalidateZamestnanci()
}

export async function updateZamestnanecNadriadeny(profileId: string, nadriadenyId: string | null) {
  const auth = await requireScopedAdmin(profileId)
  if ('error' in auth) return auth

  const adminClient = createSupabaseAdmin()

  // Self-reference check
  if (nadriadenyId && nadriadenyId === profileId) {
    return { error: 'Zamestnanec nemôže byť sám sebe nadriadeným' }
  }

  // Cycle detection — prejdeme reťaz od nadriadenyId nahor,
  // ak v nej nájdeme profileId, vznikol by cyklus
  if (nadriadenyId) {
    let current: string | null = nadriadenyId
    const visited = new Set<string>()
    while (current) {
      if (current === profileId) {
        return { error: 'Nastavenie by vytvorilo cyklus v hierarchii nadriadených' }
      }
      if (visited.has(current)) break // existujúci cyklus inde — prerušíme
      visited.add(current)
      const res = await adminClient
        .from('profiles')
        .select('nadriadeny_id')
        .eq('id', current)
        .single()
      const parent = res.data as { nadriadeny_id: string | null } | null
      current = parent?.nadriadeny_id ?? null
    }
  }

  const { error } = await adminClient.from('profiles').update({
    nadriadeny_id: nadriadenyId || null,
  }).eq('id', profileId)
  if (error) return { error: 'Chyba pri aktualizácii' }

  // Cascade: aktualizujeme schvalovatel_id na všetkých pending žiadostiach
  // tohto zamestnanca, aby ich videl nový nadriadený (nie starý)
  if (nadriadenyId) {
    await adminClient.from('dovolenky')
      .update({ schvalovatel_id: nadriadenyId })
      .eq('user_id', profileId)
      .eq('stav', 'caka_na_schvalenie')

    await adminClient.from('sluzobne_cesty')
      .update({ schvalovatel_id: nadriadenyId })
      .eq('user_id', profileId)
      .eq('stav', 'nova')
  }

  await logAudit('zmena_nadriadeneho', 'profiles', profileId, { novy_nadriadeny_id: nadriadenyId })

  revalidatePath('/admin/zamestnanci'); revalidateZamestnanci()
  revalidatePath(`/admin/zamestnanci/${profileId}`)
}

export async function updateZamestnanecPin(profileId: string, pin: string | null) {
  const auth = await requireScopedAdmin(profileId)
  if ('error' in auth) return auth

  const adminClient = createSupabaseAdmin()
  const { error } = await adminClient.from('profiles').update({
    pin: pin || null,
  }).eq('id', profileId)
  if (error) return { error: 'Chyba pri aktualizácii' }
  revalidatePath(`/admin/zamestnanci/${profileId}`)
}

export async function updateZamestnanecRole(profileId: string, role: string) {
  const auth = await requireScopedAdmin(profileId)
  if ('error' in auth) return auth

  const validRoles = ['zamestnanec', 'admin', 'fleet_manager', 'it_admin', 'fin_manager']
  if (!validRoles.includes(role)) return { error: 'Neplatná rola' }

  // Privilege escalation guard: priamy admin nesmie sám seba povýšiť na it_admin
  // a nesmie udeliť it_admin rolu inému (len existujúci it_admin to dokáže).
  if (role === 'it_admin' && auth.profile.role !== 'it_admin') {
    return { error: 'Iba it_admin môže udeliť it_admin rolu' }
  }

  const adminClient = createSupabaseAdmin()
  const { error } = await adminClient.from('profiles').update({ role }).eq('id', profileId)
  if (error) return { error: 'Chyba pri zmene roly' }

  await logAudit('zmena_roly', 'profiles', profileId, { nova_rola: role })

  revalidatePath(`/admin/zamestnanci/${profileId}`)
  revalidatePath('/admin/zamestnanci'); revalidateZamestnanci()
}

export async function updateZamestnanecTypUvazku(profileId: string, typ: string) {
  const auth = await requireScopedAdmin(profileId)
  if ('error' in auth) return auth

  const validTypy = ['tpp', 'dohoda', 'brigada', 'extern', 'materska', 'rodicovska']
  if (!validTypy.includes(typ)) return { error: 'Neplatný typ úväzku' }

  const adminClient = createSupabaseAdmin()
  const { error } = await adminClient.from('profiles').update({ typ_uvazku: typ }).eq('id', profileId)
  if (error) return { error: 'Chyba pri aktualizácii' }

  await logAudit('zmena_typu_uvazku', 'profiles', profileId, { typ })

  revalidatePath(`/admin/zamestnanci/${profileId}`)
}

export async function updateZamestnanecPristupneFirmy(profileId: string, firmaIds: string[]) {
  // Iba it_admin smie meniť pristupne_firmy (toto je multi-tenant scope grant).
  const auth = await requireScopedAdmin(profileId)
  if ('error' in auth) return auth
  if (auth.profile.role !== 'it_admin') {
    return { error: 'Iba it_admin môže meniť prístup k iným firmám' }
  }

  const adminClient = createSupabaseAdmin()
  const { error } = await adminClient.from('profiles').update({
    pristupne_firmy: firmaIds.length > 0 ? firmaIds : null,
  }).eq('id', profileId)
  if (error) return { error: 'Chyba pri aktualizácii' }

  await logAudit('zmena_pristupne_firmy', 'profiles', profileId, { firmaIds })

  revalidatePath(`/admin/zamestnanci/${profileId}`)
}

export async function updateZamestnanecAutoPip(profileId: string, enabled: boolean) {
  const auth = await requireScopedAdmin(profileId)
  if ('error' in auth) return auth

  const adminClient = createSupabaseAdmin()
  const { error } = await adminClient.from('profiles').update({
    auto_pip_enabled: enabled,
  }).eq('id', profileId)
  if (error) return { error: 'Chyba pri aktualizácii' }

  await logAudit('zmena_auto_pip', 'profiles', profileId, { enabled })

  revalidatePath(`/admin/zamestnanci/${profileId}`)
}

export async function updateZamestnanecZastupuje(profileId: string, zastupujeId: string | null) {
  const auth = await requireScopedAdmin(profileId)
  if ('error' in auth) return auth

  if (zastupujeId && zastupujeId === profileId) {
    return { error: 'Zamestnanec nemôže zastupovať sám seba' }
  }

  const adminClient = createSupabaseAdmin()
  const { error } = await adminClient.from('profiles').update({
    zastupuje_id: zastupujeId || null,
  }).eq('id', profileId)
  if (error) return { error: 'Chyba pri aktualizácii' }

  await logAudit('zmena_zastupujuceho', 'profiles', profileId, { zastupuje_id: zastupujeId })

  revalidatePath(`/admin/zamestnanci/${profileId}`)
}

export async function updateZamestnanecFond(profileId: string, tyzdnovyFond: number, pracovneDniTyzdne: number) {
  const auth = await requireScopedAdmin(profileId)
  if ('error' in auth) return auth

  if (tyzdnovyFond <= 0 || tyzdnovyFond > 60) return { error: 'Neplatný týždňový fond' }
  if (pracovneDniTyzdne < 1 || pracovneDniTyzdne > 7) return { error: 'Neplatný počet dní' }

  const denny = tyzdnovyFond / pracovneDniTyzdne

  const adminClient = createSupabaseAdmin()
  const { error } = await adminClient.from('profiles').update({
    tyzdnovy_fond_hodiny: tyzdnovyFond,
    pracovne_dni_tyzdne: pracovneDniTyzdne,
    pracovny_fond_hodiny: denny,
  }).eq('id', profileId)
  if (error) return { error: 'Chyba pri aktualizácii' }
  revalidatePath(`/admin/zamestnanci/${profileId}`)
}

export async function updateZamestnanecFirma(profileId: string, firmaId: string | null) {
  // Špeciálny prípad: ak target zatiaľ nemá firmu (čerstvo vytvorený), umožni
  // priradiť iba it_adminovi alebo adminovi v scope NOVEJ firmy.
  const adminClient = createSupabaseAdmin()
  const { data: current } = await adminClient
    .from('profiles')
    .select('firma_id')
    .eq('id', profileId)
    .single<{ firma_id: string | null }>()

  if (current?.firma_id) {
    // Má firmu — overí sa že volajúci má scope na túto firmu
    const auth = await requireScopedAdmin(profileId)
    if ('error' in auth) return auth
    // A zároveň musí mať scope na novú firmu (ak je iná)
    if (firmaId && firmaId !== current.firma_id) {
      const { requireScopedFirma } = await import('@/lib/auth-helpers')
      const newScopeAuth = await requireScopedFirma(firmaId, ['admin', 'it_admin', 'fin_manager'])
      if ('error' in newScopeAuth) return { error: `Cieľová firma mimo scope: ${newScopeAuth.error}` }
    }
  } else {
    // Nemá firmu — iba it_admin, alebo admin v scope novej firmy
    if (firmaId) {
      const { requireScopedFirma } = await import('@/lib/auth-helpers')
      const newScopeAuth = await requireScopedFirma(firmaId, ['admin', 'it_admin', 'fin_manager'])
      if ('error' in newScopeAuth) return { error: `Cieľová firma mimo scope: ${newScopeAuth.error}` }
    } else {
      const auth = await requireAdmin()
      if ('error' in auth) return auth
    }
  }

  const { error } = await adminClient.from('profiles').update({
    firma_id: firmaId || null,
  }).eq('id', profileId)
  if (error) return { error: 'Chyba pri priraďovaní firmy' }

  await logAudit('zmena_firmy', 'profiles', profileId, { firma_id: firmaId })

  revalidatePath(`/admin/zamestnanci/${profileId}`)
  revalidatePath('/admin/zamestnanci'); revalidateZamestnanci()
}

export async function updateZamestnanecDatumNastupu(profileId: string, datum: string | null) {
  const auth = await requireScopedAdmin(profileId)
  if ('error' in auth) return auth

  const adminClient = createSupabaseAdmin()
  const { error } = await adminClient.from('profiles').update({
    datum_nastupu: datum || null,
  }).eq('id', profileId)
  if (error) return { error: 'Chyba pri aktualizácii' }

  revalidatePath(`/admin/zamestnanci/${profileId}`)
}

export async function getFirmy() {
  const auth = await requireAdmin()
  if ('error' in auth) return { data: [] }
  const { data } = await auth.supabase
    .from('firmy')
    .select('id, kod, nazov, je_matka, aktivna')
    .eq('aktivna', true)
    .order('poradie')
  return { data: data || [] }
}

export async function updateZamestnanecEmail(profileId: string, email: string) {
  const auth = await requireScopedAdmin(profileId)
  if ('error' in auth) return auth

  const normalized = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { error: 'Neplatný formát emailu' }
  }

  const adminClient = createSupabaseAdmin()

  const { data: existing } = await adminClient
    .from('profiles')
    .select('id')
    .eq('email', normalized)
    .maybeSingle()
  if (existing && existing.id !== profileId) {
    return { error: 'Email už používa iný zamestnanec' }
  }

  const { data: current } = await adminClient
    .from('profiles')
    .select('email')
    .eq('id', profileId)
    .maybeSingle()
  const oldEmail = current?.email ?? null

  const { error: authErr } = await adminClient.auth.admin.updateUserById(profileId, {
    email: normalized,
    email_confirm: true,
  })
  if (authErr) return { error: `Chyba pri zmene emailu v auth: ${authErr.message}` }

  const { error: profErr } = await adminClient
    .from('profiles')
    .update({ email: normalized })
    .eq('id', profileId)
  if (profErr) {
    if (oldEmail) {
      await adminClient.auth.admin.updateUserById(profileId, {
        email: oldEmail,
        email_confirm: true,
      })
    }
    return { error: `Chyba pri zmene emailu v profile: ${profErr.message}` }
  }

  await logAudit('zmena_emailu', 'profiles', profileId, { stary: oldEmail, novy: normalized })

  revalidatePath('/admin/zamestnanci'); revalidateZamestnanci()
  revalidatePath(`/admin/zamestnanci/${profileId}`)
  return { success: true }
}

export async function resetZamestnanecPassword(profileId: string, newPassword: string) {
  const auth = await requireScopedAdmin(profileId)
  if ('error' in auth) return auth

  if (newPassword.length < 8) return { error: 'Heslo musí mať minimálne 8 znakov' }

  const adminClient = createSupabaseAdmin()
  const { error } = await adminClient.auth.admin.updateUserById(profileId, { password: newPassword })
  if (error) return { error: `Chyba pri zmene hesla: ${error.message}` }

  await logAudit('reset_hesla', 'profiles', profileId)

  return { success: true }
}
