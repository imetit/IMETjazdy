import LegalShell from '@/components/marketing/LegalShell'
import { brand } from '@/lib/brand'

export const metadata = {
  title: 'Zásady ochrany osobných údajov',
}

// PRACOVNÁ VERZIA — pred ostrým predajom korporátnemu klientovi musí túto
// stránku schváliť právnik (špecificky vo veci sub-processor zoznamu, retention
// politiky a kontaktných údajov DPO). Toto je východiskový draft.

export default function PrivacyPage() {
  return (
    <LegalShell title="Zásady ochrany osobných údajov" updated="2026-05-13 (draft)">
      <h2>1. Prevádzkovateľ</h2>
      <p>
        {brand.vendor}, Slovensko. Kontakt: <a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a>.
        Tieto zásady popisujú spracovanie osobných údajov v aplikácii {brand.name}.
      </p>

      <h2>2. Kategórie spracúvaných údajov</h2>
      <ul>
        <li><strong>Identifikačné:</strong> meno, priezvisko, email, telefón, pozícia, oddelenie, dátum nástupu</li>
        <li><strong>Pracovné:</strong> dochádzka, jazdy, dovolenky, služobné cesty, doklady, mzdové podklady</li>
        <li><strong>Vozidlové:</strong> ŠPZ, VIN, vodičské oprávnenia, tankovacie záznamy</li>
        <li><strong>Finančné:</strong> bankové údaje (IBAN — šifrovaný at-rest), faktúry od dodávateľov</li>
        <li><strong>Technické:</strong> IP adresa, user-agent, prihlasovacie časy, audit log</li>
      </ul>

      <h2>3. Účel spracovania</h2>
      <ul>
        <li>Plnenie pracovnoprávnych povinností (zákonník práce, zákon o cestných náhradách)</li>
        <li>Evidencia dochádzky pre mzdovú agendu</li>
        <li>Správa vozového parku a poistenia</li>
        <li>Bezpečnostný audit (kto čo robil v systéme)</li>
      </ul>

      <h2>4. Právny základ</h2>
      <ul>
        <li>Plnenie zmluvy (pracovná zmluva)</li>
        <li>Zákonná povinnosť (mzdové, daňové, účtovné predpisy SR)</li>
        <li>Oprávnený záujem (bezpečnosť systému, audit log)</li>
      </ul>

      <h2>5. Doba uchovávania</h2>
      <ul>
        <li>Mzdové podklady (dochádzka, jazdy): <strong>10 rokov</strong> (zákon č. 461/2003 Z. z.)</li>
        <li>Faktúry a účtovné záznamy: <strong>10 rokov</strong> (zákon č. 431/2002 Z. z.)</li>
        <li>Audit log: <strong>7 rokov</strong></li>
        <li>Profil zamestnanca: do <strong>5 rokov</strong> po skončení pracovného pomeru, potom anonymizácia</li>
      </ul>

      <h2>6. Sub-processory (príjemcovia)</h2>
      <ul>
        <li><strong>Vercel Inc.</strong> (USA) — hosting aplikácie. <a href="https://vercel.com/legal/dpa">DPA</a>.</li>
        <li><strong>Supabase Inc.</strong> (USA/EU) — databáza, autentifikácia, file storage. Európsky región (Ireland).</li>
        <li><strong>Resend Inc.</strong> (USA) — odosielanie emailov.</li>
        <li><strong>Sentry</strong> — error tracking s PII scrubbingom.</li>
        <li><strong>Upstash</strong> — rate limit cache.</li>
      </ul>

      <h2>7. Vaše práva (GDPR čl. 15–22)</h2>
      <ul>
        <li>Právo na <strong>prístup</strong> k vašim údajom — endpoint <code>/api/gdpr/export/[userId]</code></li>
        <li>Právo na <strong>opravu</strong> nesprávnych údajov</li>
        <li>Právo na <strong>výmaz</strong> — endpoint <code>/api/gdpr/delete/[userId]</code> (anonymizácia)</li>
        <li>Právo na <strong>obmedzenie</strong> spracovania</li>
        <li>Právo na <strong>prenosnosť</strong> údajov (strojovo čitateľný JSON export)</li>
        <li>Právo <strong>namietať</strong> proti spracovaniu (oprávnený záujem)</li>
      </ul>
      <p>
        Žiadosti smerujte na <a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a>. Odpovedáme do 30 dní.
        Sťažnosť môžete podať na Úrade na ochranu osobných údajov SR (<a href="https://dataprotection.gov.sk">dataprotection.gov.sk</a>).
      </p>

      <h2>8. Bezpečnostné opatrenia</h2>
      <ul>
        <li>HTTPS pre všetku komunikáciu (TLS 1.3)</li>
        <li>Šifrovanie údajov pri uložení (AES-256 na úrovni Supabase storage)</li>
        <li>IBAN encryption na úrovni stĺpca (pgcrypto + Supabase Vault)</li>
        <li>Role-based access control + multi-tenant izolácia firmy</li>
        <li>Immutable audit log všetkých zmien</li>
        <li>2FA TOTP povinné pre admin role</li>
        <li>Pravidelné aktualizácie a bezpečnostné audity</li>
      </ul>

      <h2>9. Zmeny tohto dokumentu</h2>
      <p>
        Verziu aktualizujeme pri zmenách spracovania. Materiálne zmeny oznámime emailom
        registrovaným používateľom.
      </p>

      <p className="mt-12 pt-8 border-t border-white/[0.06] text-sm text-slate-500">
        ⚠️ Pred záväzným použitím tento dokument musí schváliť právnik. Aktuálny obsah
        je pracovný draft pre účely interného nasadenia.
      </p>
    </LegalShell>
  )
}
