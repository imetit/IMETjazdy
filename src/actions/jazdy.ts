'use server'

import { createSupabaseServer } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function createJazda(formData: FormData) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('vozidlo_id').eq('id', user.id).single()
  if (!profile?.vozidlo_id) return { error: 'Nemáte priradené vozidlo' }

  const stav = formData.get('stav') as string

  const { data: jazda, error } = await supabase
    .from('jazdy')
    .insert({
      user_id: user.id,
      mesiac: formData.get('mesiac') as string,
      odchod_z: formData.get('odchod_z') as string,
      prichod_do: formData.get('prichod_do') as string,
      cez: (formData.get('cez') as string) || null,
      km: parseFloat(formData.get('km') as string),
      vozidlo_id: profile.vozidlo_id,
      cas_odchodu: formData.get('cas_odchodu') as string,
      cas_prichodu: formData.get('cas_prichodu') as string,
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

  revalidatePath('/')
  revalidatePath('/moje-jazdy')
  redirect('/moje-jazdy')
}

export async function deleteJazda(jazdaId: string) {
  const supabase = await createSupabaseServer()
  const { data: prilohy } = await supabase.from('jazdy_prilohy').select('file_path').eq('jazda_id', jazdaId)
  if (prilohy && prilohy.length > 0) {
    await supabase.storage.from('blocky').remove(prilohy.map(p => p.file_path))
  }
  await supabase.from('jazdy').delete().eq('id', jazdaId)
  revalidatePath('/moje-jazdy')
  revalidatePath('/')
}
