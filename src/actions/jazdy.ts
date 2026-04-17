'use server'

import { createSupabaseServer } from '@/lib/supabase-server'
import { requireAuth, requireAdmin, requireOwnerOrAdmin } from '@/lib/auth-helpers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function createJazda(formData: FormData) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

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

  const stav = formData.get('stav') as string

  const { data: jazda, error } = await supabase
    .from('jazdy')
    .insert({
      user_id: user.id,
      mesiac: formData.get('mesiac') as string,
      odchod_z: (formData.get('odchod_z') as string) || '',
      prichod_do: (formData.get('prichod_do') as string) || '',
      cez: (formData.get('cez') as string) || null,
      km: parseFloat(formData.get('km') as string),
      vozidlo_id: profile.vozidlo_id,
      cas_odchodu: (formData.get('cas_odchodu') as string) || '00:00',
      cas_prichodu: (formData.get('cas_prichodu') as string) || '00:00',
      stav,
    })
    .select()
    .single()

  if (error) return { error: 'Chyba pri ukladaní jazdy' }

  const files = formData.getAll('files') as File[]
  for (const file of files) {
    if (file.size === 0) continue
    const filePath = `${jazda.id}/${file.name}`
    const { error: uploadError } = await supabase.storage.from('blocky').upload(filePath, file)
    if (!uploadError) {
      await supabase.from('jazdy_prilohy').insert({
        jazda_id: jazda.id,
        file_name: file.name,
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
      await createNotifikacia(admin.id, 'nova_jazda', 'Nová jazda na spracovanie', `Nová jazda za mesiac ${formData.get('mesiac')}.`, `/admin/jazdy/${jazda.id}`)
    }
  }

  revalidatePath('/')
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
  revalidatePath('/')
}
