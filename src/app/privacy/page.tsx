export const metadata = {
  title: 'Zásady ochrany osobných údajov — IMET Jazdy',
}

// PRACOVNÁ VERZIA — pred ostrým predajom korporátnemu klientovi musí túto
// stránku schváliť právnik (špecificky vo veci sub-processor zoznamu, retention
// politiky a kontaktných údajov DPO). Toto je východiskový draft, nie záväzný
// právny dokument.

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto py-12 px-4 prose">
      <h1>Zásady ochrany osobných údajov</h1>
      <p className="text-sm text-gray-500">Posledná aktualizácia: 2026-05-13 (draft)</p>

      <h2>1. Prevádzkovateľ</h2>
      <p>
        IMET, a.s., Bratislava, Slovensko. Kontakt: <a href="mailto:it@imet.sk">it@imet.sk</a>.
        Tieto zásady popisujú spracovanie osobných údajov v interných HR a fleet
        nástrojoch IMET Jazdy.
      </p>

      <h2>2. Kategórie spracúvaných údajov</h2>
      <ul>
        <li><strong>Identifikačné:</strong> meno, priezvisko, email, telefón, pozícia, oddelenie, dátum nástupu</li>
        <li><strong>Pracovné:</strong> dochádzka, jazdy, dovolenky, služobné cesty, doklady, mzdové podklady</li>
        <li><strong>Vozidlové:</strong> ŠPZ, VIN, vodičské oprávnenia, tankovacie záznamy</li>
        <li><strong>Finančné:</strong> bankové údaje (IBAN), faktúry (od dodávateľov)</li>
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
        <li>Mzdové podklady (dochádzka, jazdy): 10 rokov (zákon č. 461/2003 Z. z.)</li>
        <li>Faktúry a účtovné záznamy: 10 rokov (zákon č. 431/2002 Z. z.)</li>
        <li>Audit log: 7 rokov</li>
        <li>Profil zamestnanca: do 5 rokov po skončení pracovného pomeru, potom anonymizácia</li>
      </ul>

      <h2>6. Sub-processory (príjemcovia)</h2>
      <ul>
        <li><strong>Vercel Inc.</strong> (USA) — hosting aplikácie. <a href="https://vercel.com/legal/dpa">DPA</a>.</li>
        <li><strong>Supabase Inc.</strong> (USA/EU) — databáza, autentifikácia, file storage. Európsky región (Ireland).</li>
        <li><strong>Resend Inc.</strong> (USA) — odosielanie emailov.</li>
        <li>(Phase 6+) <strong>Sentry</strong> — error tracking.</li>
        <li>(Phase 3+) <strong>Upstash</strong> — rate limit cache.</li>
      </ul>

      <h2>7. Vaše práva (GDPR čl. 15–22)</h2>
      <ul>
        <li>Právo na prístup k vašim údajom</li>
        <li>Právo na opravu nesprávnych údajov</li>
        <li>Právo na výmaz (s výnimkou údajov uchovávaných zo zákona)</li>
        <li>Právo na obmedzenie spracovania</li>
        <li>Právo na prenosnosť údajov</li>
        <li>Právo namietať proti spracovaniu (oprávnený záujem)</li>
      </ul>
      <p>
        Žiadosti smerujte na <a href="mailto:it@imet.sk">it@imet.sk</a>. Odpovedáme do 30 dní.
        Sťažnosť môžete podať na Úrade na ochranu osobných údajov SR (<a href="https://dataprotection.gov.sk">dataprotection.gov.sk</a>).
      </p>

      <h2>8. Bezpečnostné opatrenia</h2>
      <ul>
        <li>HTTPS pre všetku komunikáciu (TLS 1.3)</li>
        <li>Šifrovanie údajov pri uložení (AES-256 na úrovni Supabase storage)</li>
        <li>Role-based access control + multi-tenant izolácia firmy</li>
        <li>Audit log všetkých zmien</li>
        <li>Pravidelné aktualizácie a bezpečnostné audity</li>
      </ul>

      <h2>9. Zmeny tohto dokumentu</h2>
      <p>
        Verziu aktualizujeme pri zmenách spracovania. Materiálne zmeny oznámime emailom
        registrovaným používateľom.
      </p>

      <p className="text-sm text-gray-500 mt-12">
        ⚠️ Pred záväzným použitím tento dokument musí schváliť právnik. Aktuálny obsah
        je pracovný draft pre účely interného nasadenia.
      </p>
    </main>
  )
}
