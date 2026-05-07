'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import useSWR, { mutate as globalMutate } from 'swr'
import {
  Check, X, Banknote, Ban, Edit, Send, RotateCcw, AlertTriangle, FileText,
  Car, Plane, Wrench, Shield, GraduationCap, CreditCard, ArrowLeft, ChevronRight,
} from 'lucide-react'
import type { Faktura, FakturaStav, FakturyWorkflowConfig, FakturaAuditEntry } from '@/lib/faktury-types'
import { FAKTURA_STAV_LABELS, FAKTURA_STAV_COLORS, formatSuma } from '@/lib/faktury-types'
import {
  sendForApproval, approveFaktura, rejectFaktura,
  markForPayment, markPaid, cancelFaktura, forceStornoUhradenej,
} from '@/actions/faktury'

interface DetailData {
  faktura: Faktura & { firma?: { kod: string; nazov: string; faktury_workflow: FakturyWorkflowConfig }; dodavatel?: { nazov: string; ico: string | null }; vozidlo?: { spz: string; znacka: string; model: string }; cesta?: { cislo: string; ucel: string }; nahral?: { full_name: string }; schvalil_l1?: { full_name: string }; schvalil_l2?: { full_name: string }; uhradil?: { full_name: string }; bankovy_ucet?: { nazov: string; iban: string } }
  audit: (FakturaAuditEntry & { user?: { full_name: string } })[]
  dobropisy: { id: string; cislo_faktury: string; suma_celkom: number; suma_celkom_eur: number; mena: string; stav: FakturaStav; created_at: string }[]
  file_url: string | null
}

export default function FakturaDetailClient({ initialData, currentUserId, currentUserRole }: { initialData: DetailData; currentUserId: string; currentUserRole: string }) {
  const router = useRouter()
  const { data } = useSWR<DetailData>(`/api/admin/faktury/${initialData.faktura.id}`, { fallbackData: initialData })
  const detail = data || initialData
  const f = detail.faktura
  const [pending, startTransition] = useTransition()
  const [tab, setTab] = useState<'udaje' | 'subor' | 'prepojenia' | 'audit' | 'saldo'>('udaje')
  const [confirmModal, setConfirmModal] = useState<null | { action: string; title: string; needsReason?: boolean }>(null)
  const [reasonInput, setReasonInput] = useState('')
  const [datumUhradyInput, setDatumUhradyInput] = useState(new Date().toISOString().split('T')[0])
  const [bankovyUcetInput, setBankovyUcetInput] = useState<string>('')

  const isAuthor = f.nahral_id === currentUserId
  const isItAdmin = currentUserRole === 'it_admin'
  const canSchvalit = !isAuthor && f.stav === 'caka_na_schvalenie'
  const canMarkForPayment = ['admin', 'it_admin', 'fin_manager'].includes(currentUserRole) && f.stav === 'schvalena'
  const canMarkPaid = ['admin', 'it_admin', 'fin_manager'].includes(currentUserRole) && ['schvalena', 'na_uhradu'].includes(f.stav)
  const canCancel = !['uhradena', 'stornovana'].includes(f.stav)
  const canForceStorno = isItAdmin && f.stav === 'uhradena'
  const canEdit = !['uhradena', 'stornovana'].includes(f.stav)
  const canSend = isAuthor && (f.stav === 'rozpracovana' || f.stav === 'zamietnuta')

  function refresh() {
    globalMutate(`/api/admin/faktury/${f.id}`)
    globalMutate('/api/admin/faktury')
    router.refresh()
  }

  function runAction(action: () => Promise<{ error?: string; data?: unknown }>) {
    startTransition(async () => {
      const r = await action()
      if (r.error) { alert(r.error); return }
      setConfirmModal(null)
      setReasonInput('')
      refresh()
    })
  }

  return (
    <div>
      <Link href="/admin/faktury" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3">
        <ArrowLeft size={14} /> Späť na zoznam
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            {f.je_dobropis && <Ban size={18} className="inline mr-2 text-orange-500" />}
            Faktúra {f.cislo_faktury}
          </h2>
          <p className="text-gray-500">{f.dodavatel_nazov} {f.dodavatel_ico && <span className="text-xs">· IČO {f.dodavatel_ico}</span>}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2 tabular-nums">
            {formatSuma(f.suma_celkom, f.mena)}
            {f.mena !== 'EUR' && f.suma_celkom_eur != null && (
              <span className="text-base font-normal text-gray-400 ml-2">({f.suma_celkom_eur.toFixed(2)} €)</span>
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${FAKTURA_STAV_COLORS[f.stav]}`}>{FAKTURA_STAV_LABELS[f.stav]}</span>
          <p className="text-xs text-gray-400">Splatnosť: {f.datum_splatnosti}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {canSend && (
          <button onClick={() => runAction(() => sendForApproval(f.id))} disabled={pending}
            className="inline-flex items-center gap-1 bg-orange-500 text-white px-3 py-1.5 rounded text-sm hover:opacity-90 disabled:opacity-50">
            <Send size={14} /> Poslať na schválenie
          </button>
        )}
        {canSchvalit && (
          <>
            <button onClick={() => runAction(() => approveFaktura(f.id, f.version))} disabled={pending}
              className="inline-flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:opacity-90 disabled:opacity-50">
              <Check size={14} /> Schváliť (L{f.aktualny_stupen})
            </button>
            <button onClick={() => setConfirmModal({ action: 'reject', title: 'Zamietnuť faktúru', needsReason: true })} disabled={pending}
              className="inline-flex items-center gap-1 bg-red-500 text-white px-3 py-1.5 rounded text-sm hover:opacity-90 disabled:opacity-50">
              <X size={14} /> Zamietnuť
            </button>
          </>
        )}
        {canMarkForPayment && (
          <button onClick={() => runAction(() => markForPayment(f.id, f.version))} disabled={pending}
            className="inline-flex items-center gap-1 bg-blue-500 text-white px-3 py-1.5 rounded text-sm hover:opacity-90 disabled:opacity-50">
            <Banknote size={14} /> Označiť na úhradu
          </button>
        )}
        {canMarkPaid && (
          <button onClick={() => setConfirmModal({ action: 'pay', title: 'Označiť ako uhradenú' })} disabled={pending}
            className="inline-flex items-center gap-1 bg-teal-600 text-white px-3 py-1.5 rounded text-sm hover:opacity-90 disabled:opacity-50">
            <Banknote size={14} /> Označiť uhradené
          </button>
        )}
        {canEdit && (
          <Link href={`/admin/faktury/${f.id}/edit`} className="inline-flex items-center gap-1 bg-gray-100 px-3 py-1.5 rounded text-sm hover:bg-gray-200">
            <Edit size={14} /> Upraviť
          </Link>
        )}
        {f.stav === 'uhradena' && !f.je_dobropis && (
          <Link href={`/admin/faktury/nahrat?dobropis=${f.id}`} className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-3 py-1.5 rounded text-sm hover:bg-orange-200">
            <Ban size={14} /> Vytvoriť dobropis
          </Link>
        )}
        {canCancel && (
          <button onClick={() => setConfirmModal({ action: 'cancel', title: 'Stornovať faktúru', needsReason: true })} disabled={pending}
            className="inline-flex items-center gap-1 bg-gray-200 px-3 py-1.5 rounded text-sm hover:bg-gray-300">
            <Ban size={14} /> Storno
          </button>
        )}
        {canForceStorno && (
          <button onClick={() => setConfirmModal({ action: 'force_storno', title: '⚠ Force storno uhradenej', needsReason: true })} disabled={pending}
            className="inline-flex items-center gap-1 bg-red-700 text-white px-3 py-1.5 rounded text-sm hover:opacity-90">
            <AlertTriangle size={14} /> Force storno (it_admin)
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="border-b border-gray-200 px-4 flex gap-1 overflow-x-auto">
          {[
            { k: 'udaje', l: 'Údaje' },
            { k: 'subor', l: 'Súbor' },
            { k: 'prepojenia', l: 'Prepojenia' },
            { k: 'audit', l: 'Audit log' },
            ...(detail.dobropisy.length > 0 ? [{ k: 'saldo', l: 'Saldo' }] : []),
          ].map(t => (
            <button key={t.k} onClick={() => setTab(t.k as typeof tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px ${tab === t.k ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t.l}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === 'udaje' && <UdajeTab f={f} />}
          {tab === 'subor' && <SuborTab fileUrl={detail.file_url} fileName={f.file_name} mimeType={f.mime_type} />}
          {tab === 'prepojenia' && <PrepojeniaTab f={f} />}
          {tab === 'audit' && <AuditTab entries={detail.audit} />}
          {tab === 'saldo' && <SaldoTab f={f} dobropisy={detail.dobropisy} />}
        </div>
      </div>

      {confirmModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-3">{confirmModal.title}</h3>
            {confirmModal.needsReason && (
              <textarea value={reasonInput} onChange={e => setReasonInput(e.target.value)}
                placeholder="Dôvod (povinné)" className="w-full border border-gray-200 rounded p-2 mb-3 text-sm" rows={3} />
            )}
            {confirmModal.action === 'pay' && (
              <div className="space-y-3 mb-3">
                <input type="date" value={datumUhradyInput} onChange={e => setDatumUhradyInput(e.target.value)}
                  className="w-full border border-gray-200 rounded p-2 text-sm" />
                <input type="text" value={bankovyUcetInput} onChange={e => setBankovyUcetInput(e.target.value)}
                  placeholder="bankovy_ucet_id (voliteľné)" className="w-full border border-gray-200 rounded p-2 text-sm" />
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmModal(null)} className="px-4 py-2 text-sm">Zrušiť</button>
              <button onClick={() => {
                if (confirmModal.action === 'reject') runAction(() => rejectFaktura(f.id, reasonInput, f.version))
                else if (confirmModal.action === 'cancel') runAction(() => cancelFaktura(f.id, reasonInput, f.version))
                else if (confirmModal.action === 'force_storno') runAction(() => forceStornoUhradenej(f.id, reasonInput, f.version))
                else if (confirmModal.action === 'pay') runAction(() => markPaid(f.id, datumUhradyInput, bankovyUcetInput || null, f.version))
              }} className="bg-primary text-white px-4 py-2 rounded text-sm" disabled={pending || (confirmModal.needsReason && !reasonInput.trim())}>
                Potvrdiť
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function UdajeTab({ f }: { f: DetailData['faktura'] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
      <Field label="Číslo faktúry" value={f.cislo_faktury} />
      <Field label="Variabilný symbol" value={f.variabilny_symbol} />
      <Field label="Dodávateľ" value={f.dodavatel_nazov} />
      <Field label="IČO" value={f.dodavatel_ico} />
      <Field label="Suma bez DPH" value={f.suma_bez_dph != null ? formatSuma(f.suma_bez_dph, f.mena) : '—'} />
      <Field label="DPH sadzba" value={`${f.dph_sadzba} %`} />
      <Field label="DPH suma" value={f.dph_suma != null ? formatSuma(f.dph_suma, f.mena) : '—'} />
      <Field label="Suma celkom" value={formatSuma(f.suma_celkom, f.mena)} highlight />
      {f.mena !== 'EUR' && (
        <>
          <Field label="Kurz k EUR" value={f.kurz_k_eur ? `1 ${f.mena} = ${f.kurz_k_eur} EUR (${f.kurz_zdroj}, ${f.kurz_datum})` : '—'} />
          <Field label="Suma v EUR" value={f.suma_celkom_eur != null ? `${f.suma_celkom_eur.toFixed(2)} €` : '—'} />
        </>
      )}
      <Field label="IBAN" value={f.iban} />
      <Field label="Vystavená" value={f.datum_vystavenia} />
      <Field label="Doručená" value={f.datum_doruceni} />
      <Field label="Splatnosť" value={f.datum_splatnosti} highlight />
      <Field label="Uhradená" value={f.datum_uhrady} />
      <Field label="Popis" value={f.popis} fullWidth />
      <Field label="Poznámka" value={f.poznamka} fullWidth />
      <Field label="Nahral" value={f.nahral?.full_name} />
      {f.schvalil_l1 && <Field label="Schválil L1" value={`${f.schvalil_l1.full_name} (${f.schvalene_l1_at?.slice(0, 16)})`} />}
      {f.schvalil_l2 && <Field label="Schválil L2" value={`${f.schvalil_l2.full_name} (${f.schvalene_l2_at?.slice(0, 16)})`} />}
      {f.uhradil && <Field label="Uhradil" value={`${f.uhradil.full_name} (${f.uhradene_at?.slice(0, 16)})`} />}
      {f.zamietnutie_dovod && <Field label="Dôvod zamietnutia" value={f.zamietnutie_dovod} fullWidth />}
      {f.storno_dovod && <Field label="Dôvod storna" value={f.storno_dovod} fullWidth />}
    </div>
  )
}

function Field({ label, value, highlight, fullWidth }: { label: string; value: string | null | undefined; highlight?: boolean; fullWidth?: boolean }) {
  return (
    <div className={fullWidth ? 'col-span-2' : ''}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`${highlight ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{value || '—'}</p>
    </div>
  )
}

function SuborTab({ fileUrl, fileName, mimeType }: { fileUrl: string | null; fileName: string; mimeType: string | null }) {
  if (!fileUrl) return <p className="text-gray-400">Súbor nedostupný</p>
  if (mimeType?.startsWith('image/')) return <img src={fileUrl} alt={fileName} className="max-w-full rounded border" />
  return (
    <div className="space-y-3">
      <a href={fileUrl} target="_blank" rel="noopener" className="text-primary hover:underline inline-flex items-center gap-2">
        <FileText size={16} /> Stiahnuť {fileName}
      </a>
      <iframe src={fileUrl} className="w-full h-[600px] border rounded" />
    </div>
  )
}

function PrepojeniaTab({ f }: { f: DetailData['faktura'] }) {
  const links: Array<{ icon: React.ComponentType<{ size?: number }>; label: string; href?: string; value: string | null }> = [
    { icon: FileText, label: 'Firma', value: f.firma ? `${f.firma.kod} — ${f.firma.nazov}` : null },
    { icon: Car, label: 'Vozidlo', href: f.vozidlo_id ? `/admin/vozidla/${f.vozidlo_id}` : undefined, value: f.vozidlo ? `${f.vozidlo.spz} ${f.vozidlo.znacka} ${f.vozidlo.model}` : null },
    { icon: Wrench, label: 'Servis', href: f.servis_id ? `/fleet/servisy/${f.servis_id}` : undefined, value: f.servis_id ? 'Servis #' + f.servis_id.slice(0, 8) : null },
    { icon: Plane, label: 'Služobná cesta', href: f.cesta_id ? `/admin/sluzobne-cesty/${f.cesta_id}` : undefined, value: f.cesta ? `${f.cesta.cislo} — ${f.cesta.ucel}` : null },
    { icon: CreditCard, label: 'Tanková karta', href: f.tankova_karta_id ? `/fleet/tankove-karty/${f.tankova_karta_id}` : undefined, value: f.tankova_karta_id ? 'Karta #' + f.tankova_karta_id.slice(0, 8) : null },
    { icon: GraduationCap, label: 'Školenie', value: f.skolenie_id ? 'Školenie #' + f.skolenie_id.slice(0, 8) : null },
    { icon: Shield, label: 'Poistná udalosť', value: f.poistna_udalost_id ? 'Udalosť #' + f.poistna_udalost_id.slice(0, 8) : null },
    { icon: Banknote, label: 'Bankový účet', value: f.bankovy_ucet ? `${f.bankovy_ucet.nazov} (${f.bankovy_ucet.iban})` : null },
  ]
  return (
    <div className="space-y-2">
      {links.filter(l => l.value).map((l, i) => {
        const Inner = (
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded">
            <l.icon size={16} />
            <div className="flex-1">
              <p className="text-xs text-gray-500">{l.label}</p>
              <p className="text-sm">{l.value}</p>
            </div>
            {l.href && <ChevronRight size={16} className="text-gray-400" />}
          </div>
        )
        return l.href ? <Link key={i} href={l.href} className="block hover:bg-gray-100 rounded">{Inner}</Link> : <div key={i}>{Inner}</div>
      })}
      {links.every(l => !l.value) && <p className="text-gray-400">Žiadne prepojenia</p>}
    </div>
  )
}

function AuditTab({ entries }: { entries: DetailData['audit'] }) {
  return (
    <div className="space-y-2">
      {entries.map(e => (
        <div key={e.id} className="border-b border-gray-100 pb-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium">{e.akcia}</span>
            <span className="text-xs text-gray-400">{e.created_at.slice(0, 16)}</span>
          </div>
          <p className="text-xs text-gray-500">{e.user?.full_name || 'Systém'}{e.povodny_stav && e.novy_stav && ` · ${e.povodny_stav} → ${e.novy_stav}`}</p>
          {e.zmenene_polia && Object.keys(e.zmenene_polia).length > 0 && (
            <pre className="text-xs bg-gray-50 rounded p-2 mt-1 overflow-auto">{JSON.stringify(e.zmenene_polia, null, 2)}</pre>
          )}
        </div>
      ))}
      {entries.length === 0 && <p className="text-gray-400">Žiadne záznamy</p>}
    </div>
  )
}

function SaldoTab({ f, dobropisy }: { f: DetailData['faktura']; dobropisy: DetailData['dobropisy'] }) {
  const sumDobropisyEur = dobropisy.reduce((s, d) => s + Number(d.suma_celkom_eur || 0), 0)
  const saldoEur = (f.suma_celkom_eur || 0) + sumDobropisyEur // dobropisy sú negative
  return (
    <div className="space-y-4">
      <div className="bg-gray-50 rounded p-4 text-sm">
        <div className="flex justify-between"><span>Pôvodná suma:</span><span className="tabular-nums">{f.suma_celkom_eur?.toFixed(2)} €</span></div>
        {dobropisy.map(d => (
          <div key={d.id} className="flex justify-between text-orange-700">
            <span>Dobropis {d.cislo_faktury}:</span>
            <span className="tabular-nums">{d.suma_celkom_eur?.toFixed(2)} €</span>
          </div>
        ))}
        <div className="flex justify-between border-t border-gray-200 mt-2 pt-2 font-semibold">
          <span>Saldo:</span>
          <span className="tabular-nums">{saldoEur.toFixed(2)} €</span>
        </div>
      </div>
      <div className="space-y-2">
        {dobropisy.map(d => (
          <Link key={d.id} href={`/admin/faktury/${d.id}`} className="block p-3 bg-orange-50 border border-orange-200 rounded hover:bg-orange-100">
            <div className="flex items-center justify-between">
              <span className="font-medium">{d.cislo_faktury}</span>
              <span className="text-xs">{FAKTURA_STAV_LABELS[d.stav]}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
