'use server'

import { createSupabaseServer } from '@/lib/supabase-server'
import { requireAuth, requireAdmin, requireOwnerOrAdmin } from '@/lib/auth-helpers'
import { validateUpload } from '@/lib/upload-validator'
import { JazdaCreateSchema, parseFormData } from '@/lib/validation/schemas'
import { redirect } from 'next/navigation'
import { revalidatePath, updateTag } from 'next/cache'

export async function createJazda(formData: FormData) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Zod validácia — mesiac formát YYYY-MM, km nezáporné a max 100k, časy HH:MM
  const parsed = parseFormData(JazdaCreateSchema, formData)
  if (!parsed.ok) return { error: parsed.error }
  const d = parsed.data

  const { data: profile } = await supabase.from('profiles').select('vozidlo_id').eq('id', user.id).single()
  if (!profile?.vozidlo_id) return { error: 'Nemáte priradené vozidlo' }

  // Overenie že vozidlo stále existuje a je aktívne
  const { data: vozidlo } = await supabase
    .from('vozidla')
    .select('id, stav')
    .eq('id', profile.vozidlo_id)
    .single()

  if (!vozidlo || vozidlo.stav === 'vyradene') {
    return { error: 'Priradené vozidlo nie je aktívne. Kontaktujte správcu vozového parku.' }
  }

  const { data: jazda, error } = await supabase
    .from('jazdy')
    .insert({
      user_id: user.id,
      mesiac: d.mesiac,
      odchod_z: d.odchod_z,
      prichod_do: d.prichod_do,
      cez: d.cez ?? null,
      km: d.km,
      vozidlo_id: profile.vozidlo_id,
      cas_odchodu: d.cas_odchodu,
      cas_prichodu: d.cas_prichodu,
      stav: d.stav,
    })
    .select()
    .single()

  if (error) return { error: 'Chyba pri ukladaní jazdy' }
  const stav = d.stav

  const files = formData.getAll('files') as File[]
  for (const file of files) {
    if (file.size === 0) continue
    const v = validateUpload(file, { category: 'document', maxSizeMb: 25 })
    if (!v.ok) {
      // Tichý skip neplatných príloh — jazdu už máme uloženú; chybu si všimne
      // user v UI keď príloha chýba (alternatíva: zlúčiť do return error).
      continue
    }
    const filePath = `${jazda.id}/${v.safePath}`
    const { error: uploadError } = await supabase.storage.from('blocky').upload(filePath, file, {
      contentType: file.type,
    })
    if (!uploadError) {
      await supabase.from('jazdy_prilohy').insert({
        jazda_id: jazda.id,
        file_name: file.name,  // pôvodný názov si necháme len ako metadáta na zobrazenie
        file_path: filePath,
        file_size: file.size,
      })
    }
  }

  // Notifikácia adminom pri odoslaní jazdy
  if (stav === 'odoslana') {
    const { createNotifikacia } = await import('./notifikacie')
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .in('role', ['admin', 'it_admin', 'fin_manager'])
      .eq('active', true)
    for (const admin of admins || []) {
      await createNotifikacia(admin.id, 'nova_jazda', 'Nová jazda na spracovanie', `Nová jazda za mesiac ${d.mesiac}.`, `/admin/jazdy/${jazda.id}`)
    }
  }

  revalidatePath('/moje')
  revalidatePath('/moje-jazdy')
  redirect('/moje-jazdy')
}

export async function updateJazdaAdmin(jazdaId: string, data: {
  mesiac?: string; odchod_z?: string; prichod_do?: string; cez?: string;
  km?: number; cas_odchodu?: string; cas_prichodu?: string;
}) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const { error } = await auth.supabase.from('jazdy').update(data).eq('id', jazdaId)
  if (error) return { error: 'Chyba pri aktualizácii jazdy' }
  revalidatePath(`/admin/jazdy/${jazdaId}`)
  revalidatePath('/admin/jazdy')
  updateTag('jazdy')
  updateTag('dashboard')
}

export async function deleteJazda(jazdaId: string) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neprihlásený' }

  // Overenie vlastníctva alebo admin role
  const { data: jazda } = await supabase.from('jazdy').select('user_id').eq('id', jazdaId).single()
  if (!jazda) return { error: 'Jazda nenájdená' }

  const auth = await requireOwnerOrAdmin(jazda.user_id)
  if ('error' in auth) return auth

  const { data: prilohy } = await supabase.from('jazdy_prilohy').select('file_path').eq('jazda_id', jazdaId)
  if (prilohy && prilohy.length > 0) {
    await supabase.storage.from('blocky').remove(prilohy.map(p => p.file_path))
  }
  await supabase.from('jazdy').delete().eq('id', jazdaId)
  revalidatePath('/moje-jazdy')
  revalidatePath('/admin/jazdy')
  updateTag('jazdy')
  updateTag('dashboard')
  revalidatePath('/')
}
