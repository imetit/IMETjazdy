import LegalShell from '@/components/marketing/LegalShell'

export const metadata = {
  title: 'Podmienky používania',
}

// PRACOVNÁ VERZIA — pred ostrým predajom korporátnemu klientovi musí túto
// stránku schváliť právnik. Toto je východiskový draft.

export default function TermsPage() {
  return (
    <LegalShell title="Podmienky používania" updated="2026-05-13 (draft)">
      <h2>1. Definície</h2>
      <ul>
        <li><strong>Prevádzkovateľ:</strong> IMET, a.s. (a / alebo licenčný odberateľ ktorý má licenciu na použitie systému)</li>
        <li><strong>Užívateľ:</strong> osoba s aktívnym účtom v systéme IMET Jazdy</li>
        <li><strong>Služba:</strong> webová aplikácia IMET Jazdy a všetky jej funkcie</li>
      </ul>

      <h2>2. Použitie služby</h2>
      <p>
        Služba je určená na evidenciu pracovnoprávnych údajov, dochádzky, jázd, dovoleniek,
        služobných ciest a fakturácie pre interné použitie organizácie. Zneužitie údajov
        iných užívateľov, neoprávnený prístup, alebo pokus o narušenie bezpečnosti je
        prísne zakázaný a môže viesť k disciplinárnemu, civilnému alebo trestnému stíhaniu.
      </p>

      <h2>3. Účet a heslo</h2>
      <ul>
        <li>Užívateľ je zodpovedný za zachovanie dôvernosti svojho hesla a 2FA tokenu</li>
        <li>Všetky aktivity vykonané pod účtom sú považované za aktivity vlastníka účtu</li>
        <li>Stratu alebo kompromitáciu prístupových údajov treba ihneď nahlásiť na <a href="mailto:it@imet.sk">it@imet.sk</a></li>
      </ul>

      <h2>4. Dostupnosť</h2>
      <p>
        Vynakladáme primerané úsilie na zachovanie dostupnosti služby (SLA: 99,5% mesačne
        mimo plánovaných údržbových okien). Plánované údržby oznámime aspoň 24 hodín vopred.
        Neručíme za výpadky spôsobené tretími stranami (Vercel, Supabase, ECB API, atď.).
      </p>

      <h2>5. Obmedzenie zodpovednosti</h2>
      <p>
        Služba je poskytovaná &quot;ako je&quot;. V maximálnom rozsahu povolenom právom prevádzkovateľ
        neručí za škody vyplývajúce z používania alebo nemožnosti používania služby, vrátane
        ušlého zisku, straty dát alebo prerušenia podnikania. Toto obmedzenie sa nevzťahuje
        na úmyselné konanie alebo hrubú nedbalosť.
      </p>

      <h2>6. Ochrana osobných údajov</h2>
      <p>
        Spracovanie osobných údajov sa riadi samostatným dokumentom <a href="/privacy">Zásady
        ochrany osobných údajov</a> a pre korporátnych zákazníkov aj uzavretou Zmluvou o
        spracúvaní osobných údajov (DPA).
      </p>

      <h2>7. Bezpečnostné incidenty</h2>
      <p>
        Zistené bezpečnostné zraniteľnosti hláste podľa <a href="/security">Security Policy</a>.
        Prevádzkovateľ oznámi materiálne porušenie bezpečnosti dotknutým užívateľom v zákonných
        lehotách (GDPR čl. 33–34: do 72 hodín príslušnému dozornému orgánu).
      </p>

      <h2>8. Zmeny týchto podmienok</h2>
      <p>
        Podmienky môžeme aktualizovať. Materiálne zmeny oznámime emailom registrovaným
        užívateľom aspoň 30 dní vopred. Pokračujúce používanie služby po dátume účinnosti
        je súhlas s novou verziou.
      </p>

      <h2>9. Rozhodné právo</h2>
      <p>
        Tieto podmienky sa riadia právom Slovenskej republiky. Spory podliehajú jurisdikcii
        slovenských súdov.
      </p>

      <p className="mt-12 pt-8 border-t border-white/[0.06] text-sm text-slate-500">
        ⚠️ Pred záväzným použitím tento dokument musí schváliť právnik. Aktuálny obsah
        je pracovný draft pre účely interného nasadenia.
      </p>
    </LegalShell>
  )
}
