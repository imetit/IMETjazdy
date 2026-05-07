'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { Upload, X, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { createFaktura, createCreditNote } from '@/actions/faktury'
import { createDodavatel } from '@/actions/dodavatelia'
import type { Dodavatel, Mena } from '@/lib/faktury-types'
import { VSETKY_MENY, MENA_SYMBOLS } from '@/lib/faktury-types'

interface PrefillProps {
  vozidlo_id?: string; servis_id?: string; cesta_id?: string
  zamestnanec_id?: string; tankova_karta_id?: string; poistna_udalost_id?: string
  dodavatel_id?: string; firma_id?: string
  je_dobropis?: boolean; povodna_faktura_id?: string
  povodna_dodavatel?: string; povodna_mena?: Mena
}

export default function FakturaUploadForm({ prefill = {}, firmy = [] }: { prefill?: PrefillProps; firmy?: Array<{ id: string; kod: string; nazov: string }> }) {
  const router = useRouter()
  const sp = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showPrepojenia, setShowPrepojenia] = useState(!!(prefill.vozidlo_id || prefill.cesta_id))

  const dobropisId = sp.get('dobropis')
  const isDobropis = !!dobropisId || prefill.je_dobropis

  // Dodavatel autocomplete
  const [dodavatelSearch, setDodavatelSearch] = useState('')
  const [dodavatelId, setDodavatelId] = useState<string>(prefill.dodavatel_id || '')
  const [showDodavatelModal, setShowDodavatelModal] = useState(false)
  const { data: dodavatelData } = useSWR<{ data: Dodavatel[] }>(`/api/admin/dodavatelia?search=${encodeURIComponent(dodavatelSearch)}`)
  const dodavatelia = dodavatelData?.data || []
  const selectedDodavatel = dodavatelia.find(d => d.id === dodavatelId)

  // Form state
  const [mena, setMena] = useState<Mena>('EUR')
  const [dphSadzba, setDphSadzba] = useState(20)
  const [sumaBezDph, setSumaBezDph] = useState('')
  const [sumaCelkom, setSumaCelkom] = useState('')

  // Auto-compute DPH
  useEffect(() => {
    if (sumaBezDph && !sumaCelkom) {
      const c = parseFloat(sumaBezDph) * (1 + dphSadzba / 100)
      setSumaCelkom(c.toFixed(2))
    }
  }, [sumaBezDph, dphSadzba])

  function handleSubmit(action: 'draft' | 'send', formEl: HTMLFormElement) {
    const fd = new FormData(formEl)
    if (action === 'send') fd.set('action', 'send')
    if (isDobropis && dobropisId) fd.set('povodna_faktura_id', dobropisId)
    if (dodavatelId) fd.set('dodavatel_id', dodavatelId)

    startTransition(async () => {
      const result = isDobropis && dobropisId
        ? await createCreditNote(dobropisId, fd)
        : await createFaktura(fd)
      if ('error' in result && result.error) { setError(result.error); return }
      const newId = (result as { data?: { id: string } }).data?.id
      if (newId) router.push(`/admin/faktury/${newId}`)
    })
  }

  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl font-bold mb-1">{isDobropis ? 'Vytvoriť dobropis' : 'Nahrať faktúru'}</h2>
      {isDobropis && <p className="text-sm text-orange-600 mb-4">Dobropis sa viaže na pôvodnú faktúru a má negatívnu sumu.</p>}

      {error && <div className="bg-red-50 border border-red-200 text-red-800 rounded p-3 mb-4 text-sm">{error}</div>}

      <form onSubmit={e => { e.preventDefault(); handleSubmit((e.nativeEvent as SubmitEvent).submitter?.dataset.action === 'send' ? 'send' : 'draft', e.currentTarget) }} className="space-y-6">
        {isDobropis && dobropisId && <input type="hidden" name="je_dobropis" value="true" />}
        <input type="hidden" name="povodna_faktura_id" value={isDobropis && dobropisId ? dobropisId : ''} />

        {/* SÚBOR */}
        <Section title="1. Súbor faktúry">
          <input type="file" name="file" accept="application/pdf,image/jpeg,image/png,image/webp" required
            className="block w-full text-sm border border-gray-200 rounded p-2" />
          <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG, WebP — max 25MB</p>
        </Section>

        {/* DODÁVATEĽ */}
        <Section title="2. Dodávateľ">
          <input value={dodavatelSearch} onChange={e => setDodavatelSearch(e.target.value)}
            placeholder="Vyhľadať dodávateľa (názov, IČO)..."
            className="w-full border border-gray-200 rounded p-2 text-sm" />
          <div className="mt-2 max-h-48 overflow-auto border border-gray-100 rounded">
            {dodavatelia.map(d => (
              <button key={d.id} type="button" onClick={() => { setDodavatelId(d.id); setDphSadzba(d.default_dph_sadzba); setMena(d.default_mena) }}
                className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${dodavatelId === d.id ? 'bg-primary/10' : ''}`}>
                <span className="font-medium">{d.nazov}</span>
                {d.ico && <span className="text-xs text-gray-500 ml-2">IČO {d.ico}</span>}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setShowDodavatelModal(true)} className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline">
            <Plus size={14} /> Pridať nového dodávateľa
          </button>
          {!dodavatelId && (
            <input name="dodavatel_nazov" placeholder="alebo zadaj manuálne (bez evidencie)..." className="mt-2 w-full border border-gray-200 rounded p-2 text-sm" />
          )}
        </Section>

        {/* IDENTIFIKÁCIA */}
        <Section title="3. Identifikácia">
          <Grid>
            <Input name="cislo_faktury" label="Číslo faktúry *" required />
            <Input name="variabilny_symbol" label="Variabilný symbol" />
            <Input name="konstantny_symbol" label="Konštantný symbol" />
            <Input name="specificky_symbol" label="Špecifický symbol" />
          </Grid>
        </Section>

        {/* SUMA + MENA */}
        <Section title="4. Suma + DPH + mena">
          <Grid>
            <div>
              <label className="text-xs text-gray-500">Mena</label>
              <select name="mena" value={mena} onChange={e => setMena(e.target.value as Mena)} className="w-full border border-gray-200 rounded p-2 text-sm">
                {VSETKY_MENY.map(m => <option key={m} value={m}>{m} ({MENA_SYMBOLS[m]})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">DPH sadzba</label>
              <select name="dph_sadzba" value={dphSadzba} onChange={e => setDphSadzba(parseFloat(e.target.value))} className="w-full border border-gray-200 rounded p-2 text-sm">
                {[0, 10, 20, 23].map(s => <option key={s} value={s}>{s} %</option>)}
              </select>
            </div>
            <Input name="suma_bez_dph" label="Suma bez DPH" type="number" step="0.01" value={sumaBezDph} onChange={setSumaBezDph} />
            <Input name="suma_celkom" label="Suma celkom *" type="number" step="0.01" value={sumaCelkom} onChange={setSumaCelkom} required />
            {mena !== 'EUR' && (
              <Input name="kurz_k_eur" label={`Kurz 1 ${mena} = X EUR (voliteľné, inak ECB)`} type="number" step="0.000001" />
            )}
          </Grid>
        </Section>

        {/* DÁTUMY + IBAN */}
        <Section title="5. Dátumy + úhrada">
          <Grid>
            <Input name="datum_vystavenia" label="Vystavená" type="date" />
            <Input name="datum_doruceni" label="Doručená" type="date" defaultValue={new Date().toISOString().split('T')[0]} />
            <Input name="datum_splatnosti" label="Splatnosť *" type="date" required />
            <Input name="datum_zdanitelneho_plnenia" label="Zdaniteľné plnenie" type="date" />
            <Input name="iban" label="IBAN" defaultValue={selectedDodavatel?.iban || ''} />
          </Grid>
        </Section>

        {/* FIRMA + KATEGÓRIA */}
        <Section title="6. Firma + kategória">
          <Grid>
            <div>
              <label className="text-xs text-gray-500">Firma *</label>
              <select name="firma_id" defaultValue={prefill.firma_id || ''} required className="w-full border border-gray-200 rounded p-2 text-sm">
                <option value="">— vyberte —</option>
                {firmy.map(f => <option key={f.id} value={f.id}>{f.kod} — {f.nazov}</option>)}
              </select>
            </div>
            <Input name="oddelenie" label="Oddelenie" />
            <Input name="tagy" label="Tagy (oddelené čiarkou)" />
          </Grid>
        </Section>

        {/* PREPOJENIA */}
        <button type="button" onClick={() => setShowPrepojenia(!showPrepojenia)} className="flex items-center gap-2 text-sm font-medium text-gray-700">
          {showPrepojenia ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          7. Prepojenia (vozidlo, cesta, servis...)
        </button>
        {showPrepojenia && (
          <div className="bg-gray-50 rounded p-4 space-y-3">
            <Grid>
              <Input name="vozidlo_id" label="Vozidlo ID" defaultValue={prefill.vozidlo_id} />
              <Input name="servis_id" label="Servis ID" defaultValue={prefill.servis_id} />
              <Input name="cesta_id" label="Cesta ID" defaultValue={prefill.cesta_id} />
              <Input name="zamestnanec_id" label="Zamestnanec ID (preplátenie)" defaultValue={prefill.zamestnanec_id} />
              <Input name="tankova_karta_id" label="Tanková karta ID" defaultValue={prefill.tankova_karta_id} />
              <Input name="skolenie_id" label="Školenie ID" />
              <Input name="poistna_udalost_id" label="Poistná udalosť ID" defaultValue={prefill.poistna_udalost_id} />
              <Input name="bankovy_ucet_id" label="Bankový účet ID (úhrada)" />
            </Grid>
          </div>
        )}

        {/* POPIS */}
        <Section title="8. Popis a poznámka">
          <textarea name="popis" placeholder="Popis (napr. Servis Škoda BB123BB - výmena olejov)" className="w-full border border-gray-200 rounded p-2 text-sm" rows={2} />
          <textarea name="poznamka" placeholder="Poznámka (interné)" className="w-full border border-gray-200 rounded p-2 text-sm mt-2" rows={2} />
        </Section>

        <div className="flex gap-2 justify-end sticky bottom-0 bg-white py-3 border-t border-gray-200">
          <button type="submit" data-action="draft" disabled={pending} className="px-4 py-2 border border-gray-200 rounded text-sm hover:bg-gray-50 disabled:opacity-50">
            Uložiť ako rozpracovanú
          </button>
          <button type="submit" data-action="send" disabled={pending} className="bg-primary text-white px-4 py-2 rounded text-sm hover:opacity-90 disabled:opacity-50">
            Poslať na schválenie
          </button>
        </div>
      </form>

      {showDodavatelModal && (
        <DodavatelInlineModal onClose={() => setShowDodavatelModal(false)} onCreated={(id) => { setDodavatelId(id); setShowDodavatelModal(false) }} />
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-medium text-gray-900 mb-2">{title}</h3>
      {children}
    </div>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>
}

function Input({ name, label, type = 'text', required, defaultValue, value, onChange, step }: {
  name: string; label: string; type?: string; required?: boolean
  defaultValue?: string; value?: string; onChange?: (v: string) => void; step?: string
}) {
  return (
    <div>
      <label className="text-xs text-gray-500">{label}</label>
      <input
        name={name} type={type} required={required} defaultValue={defaultValue} step={step}
        {...(value !== undefined ? { value, onChange: (e) => onChange?.(e.target.value) } : {})}
        className="w-full border border-gray-200 rounded p-2 text-sm" />
    </div>
  )
}

function DodavatelInlineModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-auto">
        <h3 className="text-lg font-bold mb-3">Nový dodávateľ</h3>
        {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
        <form onSubmit={e => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          startTransition(async () => {
            const r = await createDodavatel(fd)
            if ('error' in r && r.error) setError(r.error)
            else onCreated((r as { data: { id: string } }).data.id)
          })
        }} className="space-y-2">
          <Input name="nazov" label="Názov *" required />
          <Input name="ico" label="IČO" />
          <Input name="dic" label="DIČ" />
          <Input name="ic_dph" label="IČ DPH" />
          <Input name="iban" label="IBAN" />
          <div>
            <label className="text-xs text-gray-500">Default mena</label>
            <select name="default_mena" className="w-full border border-gray-200 rounded p-2 text-sm">
              {VSETKY_MENY.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <Input name="default_dph_sadzba" label="Default DPH (%)" type="number" defaultValue="20" />
          <div className="flex gap-2 justify-end mt-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm">Zrušiť</button>
            <button type="submit" disabled={pending} className="bg-primary text-white px-4 py-2 rounded text-sm">Vytvoriť</button>
          </div>
        </form>
      </div>
    </div>
  )
}
