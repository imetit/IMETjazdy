// src/actions/cestovne-prikazy.ts
'use server'

import { createSupabaseServer } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function createPrikaz(formData: FormData) {
  const supabase = await createSupabaseServer()
  const cestaId = formData.get('sluzobna_cesta_id') as string

  const dieta = parseFloat(formData.get('dieta_suma') as string) || 0
  const km = parseFloat(formData.get('km_nahrada') as string) || 0
  const ubytovanie = parseFloat(formData.get('ubytovanie') as string) || 0
  const ine = parseFloat(formData.get('ine_naklady') as string) || 0
  const celkom = dieta + km + ubytovanie + ine

  const { error } = await supabase.from('cestovne_prikazy').insert({
    sluzobna_cesta_id: cestaId,
    cislo_prikazu: formData.get('cislo_prikazu') as string || null,
    dieta_suma: dieta,
    km_nahrada: km,
    ubytovanie,
    ine_naklady: ine,
    celkom,
  })

  if (error) return { error: 'Chyba pri vytváraní príkazu' }
  revalidatePath(`/admin/sluzobne-cesty/${cestaId}`)
}

export async function updatePrikaz(id: string, formData: FormData) {
  const supabase = await createSupabaseServer()

  const dieta = parseFloat(formData.get('dieta_suma') as string) || 0
  const km = parseFloat(formData.get('km_nahrada') as string) || 0
  const ubytovanie = parseFloat(formData.get('ubytovanie') as string) || 0
  const ine = parseFloat(formData.get('ine_naklady') as string) || 0
  const celkom = dieta + km + ubytovanie + ine

  const { error } = await supabase.from('cestovne_prikazy').update({
    cislo_prikazu: formData.get('cislo_prikazu') as string || null,
    dieta_suma: dieta,
    km_nahrada: km,
    ubytovanie,
    ine_naklady: ine,
    celkom,
    stav: formData.get('stav') as string || 'navrh',
  }).eq('id', id)

  if (error) return { error: 'Chyba pri aktualizácii' }

  const cestaId = formData.get('sluzobna_cesta_id') as string
  revalidatePath(`/admin/sluzobne-cesty/${cestaId}`)
}
