'use client'

import { useState } from 'react'
import Modal from './Modal'
import { createVozidlo, updateVozidlo } from '@/actions/vozidla'
import type { Vozidlo } from '@/lib/types'

export default function VozidloModal({ vozidlo, onClose }: { vozidlo?: Vozidlo | null; onClose: () => void }) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const isEdit = !!vozidlo

  async function handleSubmit(formData: FormData) {
    const e: Record<string, string> = {}
    if (!(formData.get('znacka') as string)?.trim()) e.znacka = 'Povinné pole'
    if (!(formData.get('spz') as string)?.trim()) e.spz = 'Povinné pole'
    if (parseFloat(formData.get('spotreba_tp') as string) <= 0) e.spotreba_tp = 'Musí byť > 0'
    if (Object.keys(e).length > 0) { setErrors(e); return }

    setLoading(true)
    const result = isEdit ? await updateVozidlo(vozidlo!.id, formData) : await createVozidlo(formData)
    if (result?.error) { setErrors({ form: result.error }); setLoading(false) }
    else onClose()
  }

  const ic = (hasError: boolean) => `w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${hasError ? 'border-red-400' : 'border-gray-300'}`

  return (
    <Modal title={isEdit ? 'Upraviť vozidlo' : 'Pridať vozidlo'} onClose={onClose}>
      <form action={handleSubmit}>
        {errors.form && <p className="text-red-500 text-sm mb-4">{errors.form}</p>}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Značka *</label>
              <input name="znacka" defaultValue={vozidlo?.znacka} className={ic(!!errors.znacka)} placeholder="Škoda" />
              {errors.znacka && <p className="text-red-500 text-xs mt-1">{errors.znacka}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Variant</label>
              <input name="variant" defaultValue={vozidlo?.variant} className={ic(false)} placeholder="Octavia Combi" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ŠPZ *</label>
              <input name="spz" defaultValue={vozidlo?.spz} className={ic(!!errors.spz)} placeholder="BA 123 AB" />
              {errors.spz && <p className="text-red-500 text-xs mt-1">{errors.spz}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Druh</label>
              <select name="druh" defaultValue={vozidlo?.druh || 'osobne'} className={ic(false)}>
                <option value="osobne">Osobné</option>
                <option value="nakladne">Nákladné</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Palivo</label>
              <select name="palivo" defaultValue={vozidlo?.palivo || 'diesel'} className={ic(false)}>
                <option value="diesel">Diesel</option>
                <option value="premium_diesel">Prémiový Diesel</option>
                <option value="benzin_e10">Benzín E10 (95)</option>
                <option value="benzin_e5">Benzín E5 (100)</option>
                <option value="lpg">LPG</option>
                <option value="elektro">Elektro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Spotreba TP (l/100km) *</label>
              <input type="number" step="0.1" name="spotreba_tp" defaultValue={vozidlo?.spotreba_tp} className={ic(!!errors.spotreba_tp)} placeholder="6.5" />
              {errors.spotreba_tp && <p className="text-red-500 text-xs mt-1">{errors.spotreba_tp}</p>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Objem motora (cm3)</label>
            <input type="number" name="objem_motora" defaultValue={vozidlo?.objem_motora} className={ic(false)} placeholder="1968" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button type="button" onClick={onClose} className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">Zrušiť</button>
          <button type="submit" disabled={loading} className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">{isEdit ? 'Uložiť zmeny' : 'Pridať'}</button>
        </div>
      </form>
    </Modal>
  )
}
