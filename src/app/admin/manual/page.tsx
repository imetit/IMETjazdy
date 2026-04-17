import ManualPage, { ManualSection } from '@/components/ManualPage'

const sections: ManualSection[] = [
  // ═══════════════════════════════════════════════════════════
  // 1. PREHĽAD SYSTÉMU
  // ═══════════════════════════════════════════════════════════
  {
    id: 'prehlad',
    title: '1. Prehľad systému — Čo je IMET interný systém',
    content: (
      <>
        <p>
          <strong>IMET interný systém</strong> je webová aplikácia pre kompletnú správu firemných procesov
          skupiny IMET (8 firiem, ~200 zamestnancov). Systém pokrýva:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Kniha jázd</strong> — evidencia služobných jázd a výpočet cestovných náhrad</li>
          <li><strong>Vozový park</strong> — správa vozidiel, servisy, kontroly, tankovanie, poistné udalosti</li>
          <li><strong>Zamestnanecká karta</strong> — profil zamestnanca, majetok, licencie, školenia</li>
          <li><strong>Dochádzka</strong> — príchody/odchody cez tablet (PIN/RFID), dovolenky</li>
          <li><strong>Služobné cesty</strong> — žiadosti, schvaľovanie, vyúčtovanie, diéty</li>
          <li><strong>Archív dokumentov</strong> — centrálne úložisko s kategóriami, verziovaním, workflow</li>
        </ul>

        <p><strong>Technológie:</strong> Next.js 16, React 19, Supabase (PostgreSQL + Auth + Storage), Vercel hosting.</p>

        <p><strong>Multi-tenant:</strong> Systém podporuje 8 firiem (IMET a.s., IMET-TEC, AKE, ZVL, IMET CZ, Galicia Nueva, IMET KE, IMET-AKE). Každý zamestnanec je priradený k jednej firme. Niektoré firmy majú prístup len k dochádzke a dovolenkám, iné k plnému systému.</p>
      </>
    ),
  },

  // ═══════════════════════════════════════════════════════════
  // 2. ROLY A OPRÁVNENIA
  // ═══════════════════════════════════════════════════════════
  {
    id: 'roly',
    title: '2. Roly, oprávnenia a logika prístupov',
    content: (
      <>
        <p><strong>5 systémových rolí:</strong></p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>zamestnanec</strong> — bežný zamestnanec. Vidí len svoje dáta: moje jazdy, moje vozidlo, moja karta, moja dochádzka, moje dovolenky, moje služobné cesty. Nemá prístup k admin panelu.</li>
          <li><strong>admin</strong> — účtovníčka (napr. Turčeková). Spracováva jazdy, spravuje zamestnancov, schvaľuje dovolenky a cesty, spravuje archív dokumentov. Vidí dáta všetkých zamestnancov.</li>
          <li><strong>fleet_manager</strong> — správca vozového parku (napr. Slovák). Spravuje vozidlá, servisy, kontroly STK/EK/PZP, hlásenia, poistné udalosti. Nemá prístup k jazdám ani zamestnancom.</li>
          <li><strong>fin_manager</strong> — finančná riaditeľka. Vidí všetky moduly okrem správy zamestnancov a nastavení. Schvaľuje doklady služobných ciest, vidí finančné reporty.</li>
          <li><strong>it_admin</strong> — IT správca (ty). Plný prístup ku všetkému. Jedine it_admin môže meniť role, nastavenia systému a spravovať firmy.</li>
        </ul>

        <p><strong>Module permissions (oprávnenia per modul):</strong></p>
        <p>Okrem systémovej roly má každý zamestnanec granulárne oprávnenia pre 9 modulov:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>jazdy</strong>, <strong>vozovy_park</strong>, <strong>zamestnanecka_karta</strong>, <strong>dochadzka</strong>, <strong>dovolenky</strong>, <strong>sluzobne_cesty</strong>, <strong>archiv</strong>, <strong>admin_zamestnanci</strong>, <strong>admin_nastavenia</strong></li>
        </ul>
        <p>Každý modul má 3 úrovne prístupu:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>view</strong> — len čítanie (vidí dáta, nemôže meniť)</li>
          <li><strong>edit</strong> — čítanie + zápis (môže vytvárať a upravovať)</li>
          <li><strong>admin</strong> — plná správa modulu</li>
        </ul>
        <p>it_admin má automaticky plný prístup ku všetkému bez ohľadu na modul permissions.</p>

        <p><strong>Logika schvaľovania:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Dovolenky a služobné cesty schvaľuje <strong>priamy nadriadený</strong> (pole <code>nadriadeny_id</code> v profile).</li>
          <li>Ak je nadriadený na schválenej dovolenke, schvaľuje <strong>zastupujúci</strong> (<code>zastupuje_id</code>).</li>
          <li>Self-approval je blokovaný — nemôžete si schváliť vlastnú dovolenku.</li>
          <li>Cyklus v hierarchii je detekovaný — A nemôže byť nadriadený B ak B je nadriadený A.</li>
        </ul>

        <p><strong>RLS (Row Level Security):</strong></p>
        <p>Databáza používa RLS politiky. Zamestnanec vidí len svoje záznamy. Admin/fleet/fin_manager vidia všetko v rámci svojho modulu. Admin operácie (vytváranie užívateľov, zmena rolí) používajú <code>createSupabaseAdmin()</code> s service role key, čím obchádzajú RLS.</p>
      </>
    ),
  },

  // ═══════════════════════════════════════════════════════════
  // 3. DASHBOARD
  // ═══════════════════════════════════════════════════════════
  {
    id: 'dashboard',
    title: '3. Dashboard — Prehľad systému',
    content: (
      <>
        <p><strong>Admin dashboard</strong> (<code>/admin</code>) zobrazuje:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Jazdy na spracovanie</strong> — počet odoslaných jázd čakajúcich na spracovanie účtovníčkou</li>
          <li><strong>Dovolenky na schválenie</strong> — žiadosti čakajúce na nadriadeného</li>
          <li><strong>Nové služobné cesty</strong> — žiadosti na schválenie</li>
          <li><strong>Hlásenia</strong> — nové hlásenia problémov s vozidlami</li>
          <li><strong>Aktívni zamestnanci</strong> — celkový počet (bez tablet účtov)</li>
        </ul>

        <p><strong>Widgety na dashboarde:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Posledné jazdy</strong> — 5 najnovších jázd s menom, mesiacom, km, stavom</li>
          <li><strong>Audit log</strong> — posledných 8 akcií (kto čo kedy urobil)</li>
          <li><strong>Blížiace sa expirácie STK/EK</strong> — vozidlá s kontrolami expirujúcimi do 30 dní (červené &lt;7 dní, oranžové &lt;30)</li>
          <li><strong>Expirujúce školenia</strong> — zamestnanci so školeniami blížiacimi sa k expirácii</li>
          <li><strong>Expirujúce dokumenty</strong> — dokumenty v archíve s nastavenou platnosťou, ktorá končí</li>
        </ul>
      </>
    ),
  },

  // ═══════════════════════════════════════════════════════════
  // 4. KNIHA JÁZD
  // ═══════════════════════════════════════════════════════════
  {
    id: 'kniha-jazd',
    title: '4. Kniha jázd — Kompletná logika',
    content: (
      <>
        <p><strong>Čo je kniha jázd:</strong> Elektronická evidencia služobných jázd pre výpočet cestovných náhrad podľa zákona o cestovných náhradách.</p>

        <p><strong>Ako to funguje — pohľad zamestnanca:</strong></p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Zamestnanec ide na <strong>&quot;Nová jazda&quot;</strong></li>
          <li>Vyplní: <strong>mesiac</strong>, <strong>trasa</strong> (odkiaľ → cez → kam), <strong>km</strong>, čas odchodu/príchodu</li>
          <li>Voliteľne nahrá <strong>bločky</strong> (parkovné, mýto) — ukladajú sa do Storage bucketu &quot;blocky&quot;</li>
          <li>Klikne <strong>&quot;Odoslať&quot;</strong> → stav = &quot;odoslaná&quot;, admini dostanú notifikáciu</li>
          <li>Alebo <strong>&quot;Uložiť rozpracovanú&quot;</strong> → stav = &quot;rozpracovaná&quot;, môže sa vrátiť a dokončiť</li>
        </ol>

        <p><strong>Ako to funguje — pohľad admina (účtovníčky):</strong></p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>V <strong>&quot;Prijaté jazdy&quot;</strong> vidí zoznam odoslaných jázd</li>
          <li>Klikne na jazdu → detail s údajmi a bločkami</li>
          <li>Vyberie <strong>typ jazdy</strong>: firemné auto doma / zahraničie, súkromné auto doma / zahraničie</li>
          <li>Systém <strong>automaticky vypočíta</strong> náhrady (PHM z normovanej spotreby + ceny paliva, stravné, vreckové)</li>
          <li>Voliteľne zadá <strong>skutočnú spotrebu</strong> z bločkov (litry + cena) → systém porovná s normovanou</li>
          <li>Klikne <strong>&quot;Spracovať&quot;</strong> → pridelí sa číslo dokladu, stav = &quot;spracovaná&quot;, zamestnanec dostane notifikáciu</li>
        </ol>

        <p><strong>Hromadné spracovanie:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Zaškrtnite viacero jázd (len v stave &quot;odoslaná&quot;) → kliknite <strong>&quot;Spracovať vybrané&quot;</strong></li>
          <li>Systém spracuje všetky vybrané naraz s automatickým výpočtom</li>
          <li><strong>&quot;Vrátiť vybrané&quot;</strong> — vráti jazdy zamestnancovi s komentárom čo treba opraviť</li>
        </ul>

        <p><strong>Výpočet náhrad — logika:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Firemné auto:</strong> normovaná spotreba z TP × cena paliva z nastavení × km / 100 = PHM náhrada. Plus stravné podľa dĺžky jazdy.</li>
          <li><strong>Súkromné auto:</strong> zákonná sadzba za km (aktuálne 0,239 €/km) × km. Plus stravné.</li>
          <li><strong>Stravné:</strong> do 5h = 0, 5-12h = 7,80 €, nad 12h = 11,60 € (aktuálne sadzby).</li>
          <li><strong>Zahraničie:</strong> stravné + vreckové (% z nastavení)</li>
          <li>DPH sa odpočítava z PHM náhrady podľa sadzby v nastaveniach</li>
        </ul>

        <p><strong>PDF export:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Cestovný príkaz</strong> — PDF per jazda s hlavičkou firmy, údajmi o zamestnancom, vozidle, trase, výpočtom náhrad, podpisovými riadkami</li>
          <li><strong>Mesačný sumár</strong> — PDF so všetkými jazdami zamestnanca za mesiac, sumárnymi km a náhradami</li>
        </ul>

        <p><strong>Prepojenia:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Jazda používa priradené vozidlo zamestnanca (z <code>profiles.vozidlo_id</code>)</li>
          <li>Ak je jazda prepojená so služobnou cestou (<code>sluzobna_cesta_id</code>), aktualizuje skutočné km na ceste</li>
          <li>Sadzby a ceny palív sa berú z <strong>Nastavenia → Palivá</strong> a <strong>Nastavenia → Sadzby</strong></li>
        </ul>

        <p><strong>Nastavenia pre jazdy (Nastavenia → tab Palivá a Sadzby):</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Ceny palív:</strong> diesel, premium diesel, benzín E10, benzín E5, LPG, elektro</li>
          <li><strong>Sadzba za km:</strong> zákonná sadzba pre súkromné vozidlo</li>
          <li><strong>Stravné sadzby:</strong> do 5h, 5-12h, 12-18h, nad 18h (domáce a zahraničné)</li>
          <li><strong>DPH:</strong> sadzba pre odpočet DPH z PHM</li>
        </ul>
      </>
    ),
  },

  // ═══════════════════════════════════════════════════════════
  // 5. VOZOVÝ PARK
  // ═══════════════════════════════════════════════════════════
  {
    id: 'vozovy-park',
    title: '5. Vozový park — Kompletná logika',
    content: (
      <>
        <p><strong>Moduly vozového parku:</strong></p>

        <p><strong>5.1 Vozidlá — správa:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Pridanie: značka, model, ŠPZ, VIN, rok výroby, typ paliva, normovaná spotreba, objem motora</li>
          <li>Stavy: <strong>Aktívne</strong> (v prevádzke), <strong>V servise</strong> (dočasne odstavené), <strong>Vyradené</strong> (trvalo)</li>
          <li>Detail vozidla má <strong>13 tabov</strong>: Základné, Dokumenty, Servisy, Kontroly, História km, Hlásenia, Diaľničné známky, História držiteľov, Odovzdávacie protokoly, Vodiči, Tachometer, Tankovanie, Tankové karty</li>
        </ul>

        <p><strong>5.2 Zdieľané vozidlá (tab Vodiči):</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Vozidlo môže mať viacero vodičov (M:N vzťah cez tabuľku <code>vozidlo_vodici</code>)</li>
          <li>Jeden vodič je <strong>primárny</strong> — hlavný zodpovedný za vozidlo</li>
          <li>Pridať vodiča: vyberte z listu zamestnancov → nastavte či je primárny</li>
          <li>Keď sa zmení primárny vodič, aktualizuje sa aj <code>vozidla.priradeny_vodic_id</code></li>
        </ul>

        <p><strong>5.3 Tachometer (tab Tachometer):</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Mesačné záznamy stavu tachometra (tabuľka <code>vozidlo_tacho_zaznamy</code>)</li>
          <li>Ručné zadanie: mesiac (YYYY-MM) + stav km</li>
          <li>Validácia: nový záznam musí byť &gt;= predchádzajúci</li>
          <li>Systém počíta rozdiel od predchádzajúceho mesiaca</li>
        </ul>

        <p><strong>5.4 Tankovanie (tab Tankovanie):</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Záznamy: dátum, litrov, cena za liter, celková cena, km na tachometri, plná náplň, tanková karta</li>
          <li><strong>Priemerná spotreba L/100km</strong> — počíta sa z po sebe idúcich plných náplní: <code>(litrov / (km2 - km1)) × 100</code></li>
          <li>Ak nie je dosť dát (menej ako 2 plné náplne), zobrazí &quot;Nedostatok dát&quot;</li>
        </ul>

        <p><strong>5.5 Tankové karty (tab + samostatná stránka /fleet/tankove-karty):</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Typy: Shell, OMV, Slovnaft, Iná</li>
          <li>Priradenie: buď k <strong>vozidlu</strong> ALEBO k <strong>vodičovi</strong> (nie obom — DB constraint)</li>
          <li>Stavy: aktívna (zelená), blokovaná (oranžová), zrušená (červená)</li>
          <li>Mesačný limit, platnosť do</li>
        </ul>

        <p><strong>5.6 Servisy:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Typy: servis, porucha, nehoda, údržba</li>
          <li>Stavy: plánované, prebieha, dokončené</li>
          <li><strong>Plánovanie:</strong> pri dokončení servisu nastavte <code>nasledny_servis_km</code> alebo <code>nasledny_servis_datum</code></li>
          <li>Dashboard widget &quot;Blížiace sa servisy&quot; upozorní keď sa blíži dátum alebo km</li>
          <li>Prílohy: faktúry, servisné protokoly do bucketu &quot;fleet-documents&quot;</li>
        </ul>

        <p><strong>5.7 Kontroly STK/EK/PZP/Havarijné:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Dátum vykonania + platnosť do</li>
          <li>Automatické upozornenia: 30/14/7 dní pred expíráciou na dashboarde</li>
          <li>Farebné indikátory: červená (expirované/&lt;7 dní), oranžová (&lt;30 dní), zelená (OK)</li>
        </ul>

        <p><strong>5.8 Poistné udalosti — workflow:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Nahlásená</strong> → zamestnanec vyplnil formulár (dátum, miesto, popis, svedkovia, fotky)</li>
          <li><strong>Riešená</strong> → fleet manager prevzal, zbiera podklady</li>
          <li><strong>U poisťovne</strong> → odoslané poisťovni, notifikácia fin_managerovi</li>
          <li><strong>Vyriešená</strong> → poisťovňa rozhodla, notifikácia fin_managerovi</li>
          <li><strong>Finančné polia:</strong> číslo poistky, odhadovaná škoda, skutočná škoda, plnenie poisťovne, spoluúčasť (auto-calculated: skutočná - plnenie)</li>
          <li>Spoluúčasť sa premietne do nákladov na vozidlo v reportoch</li>
        </ul>

        <p><strong>5.9 Hlásenia problémov:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Zamestnanec nahlási problém → fleet_manager + it_admin dostanú notifikáciu</li>
          <li>Stavy: nové → prebieha → vyriešené</li>
          <li>Priority: nízka, normálna, vysoká, kritická</li>
        </ul>

        <p><strong>5.10 Náklady per vozidlo (Fleet → Reporty):</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Agregácia: servisy (sumy) + tankovanie (sumy) + kontroly (poplatky) + poistné udalosti (spoluúčasť)</li>
          <li>Filtruje sa podľa vozidla a roku</li>
          <li>Zobrazenie: tabuľka s rozdelením + vizuálne stĺpce</li>
        </ul>
      </>
    ),
  },

  // ═══════════════════════════════════════════════════════════
  // 6. ZAMESTNANECKÁ KARTA
  // ═══════════════════════════════════════════════════════════
  {
    id: 'zamestnanecka-karta',
    title: '6. Zamestnanecká karta — Kompletná logika',
    content: (
      <>
        <p><strong>Zamestnanecká karta</strong> je profil zamestnanca so všetkými priradeniami.</p>

        <p><strong>6.1 Základné údaje:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Meno, email, pozícia, firma, rola, úväzok (TPP/dohoda/brigáda/extern/materská/rodičovská)</li>
          <li>Týždenný fond hodín (default 42,5h = 8,5h × 5 dní), pracovné dni v týždni</li>
          <li>Dátum nástupu, nadriadený, zastupujúci, priradené vozidlo, PIN kód (pre tablet dochádzku)</li>
        </ul>

        <p><strong>6.2 Majetok (IT vybavenie):</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Tabuľka <code>zamestnanecka_majetok</code> — názov, typ, sériové číslo, cena, dátum pridelenia</li>
          <li>Admin pridáva/odoberá majetok v detaile zamestnanca</li>
          <li>Zamestnanec vidí svoj majetok v &quot;Moja karta&quot; (len čítanie)</li>
        </ul>

        <p><strong>6.3 Licencie:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Tabuľka <code>zamestnanecka_licencia</code> — softvérové licencie (M365, VPN, atď.)</li>
          <li>Platnosť, typ, poznámka</li>
        </ul>

        <p><strong>6.4 RFID karty:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Tabuľka <code>rfid_karty</code> — prístupové karty na dvere, dochádzku</li>
          <li>Číslo karty, stav (aktívna/deaktivovaná)</li>
        </ul>

        <p><strong>6.5 Školenia a certifikáty:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Typy: BOZP, Ochrana pred požiarmi (OPP), Vodičský preukaz, Odborné školenie, Iné</li>
          <li>Dátum absolvovaný, platnosť do, certifikát (upload do Storage)</li>
          <li><strong>Auto-výpočet stavu:</strong> ak platnost_do &lt; dnes → &quot;expirované&quot; (červená), ak &lt; dnes+30d → &quot;blíži sa&quot; (oranžová), inak &quot;platné&quot; (zelená)</li>
          <li>Expirujúce školenia sa zobrazujú na admin dashboarde</li>
          <li>Zamestnanec vidí svoje školenia v &quot;Moja karta&quot;</li>
        </ul>

        <p><strong>6.6 Onboarding workflow:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Pri novom zamestnancovi kliknite <strong>&quot;Spustiť onboarding&quot;</strong> → vytvorí sa checklist</li>
          <li>Default položky: Podpis zmluvy, BOZP školenie, Prevzatie IT vybavenia, RFID karta, Prístupy, Úvodné školenie</li>
          <li>Každú položku zaškrtnete keď je splnená — systém zaznamenáva kto a kedy</li>
          <li>Môžete pridať vlastné (custom) položky</li>
          <li>Progress bar ukazuje % dokončenia</li>
        </ul>

        <p><strong>6.7 Offboarding workflow:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Pri odchode zamestnanca kliknite <strong>&quot;Spustiť offboarding&quot;</strong></li>
          <li>Nastaví <code>offboarding_stav = &apos;zahajeny&apos;</code>, vytvorí checklist: Vrátenie IT, Deaktivácia RFID, Odovzdanie vozidla, Zrušenie prístupov, Výpočet dovolenky, Vyúčtovanie cestovných</li>
          <li>Po dokončení všetkých položiek → kliknite <strong>&quot;Dokončiť offboarding&quot;</strong></li>
          <li>Systém deaktivuje profil (<code>active = false</code>, <code>offboarding_stav = &apos;dokonceny&apos;</code>)</li>
        </ul>

        <p><strong>6.8 iCal kalendár (Outlook sync):</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Každý zamestnanec má unikátny <code>ical_token</code></li>
          <li>URL: <code>/api/cal/&#123;token&#125;</code> generuje VCALENDAR feed s dovolenkami a cestami</li>
          <li>V &quot;Moja karta&quot; je banner s linkom a tlačidlom &quot;Kopírovať&quot;</li>
          <li>Zamestnanec si link pridá do Outlook: Súbor → Nastavenia konta → Internetové kalendáre</li>
        </ul>

        <p><strong>6.9 PDF export karty:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Tlačidlo &quot;Exportovať PDF&quot; v admin detaile zamestnanca</li>
          <li>Generuje A4 PDF s hlavičkou firmy, osobnými údajmi, majetkom, licenciami, školeniami</li>
        </ul>
      </>
    ),
  },

  // ═══════════════════════════════════════════════════════════
  // 7. SLUŽOBNÉ CESTY
  // ═══════════════════════════════════════════════════════════
  {
    id: 'sluzobne-cesty',
    title: '7. Služobné cesty — Kompletná logika',
    content: (
      <>
        <p><strong>Flow služobnej cesty:</strong></p>
        <ol className="list-decimal pl-5 space-y-1">
          <li><strong>Zamestnanec</strong> podá žiadosť: dátumy, trasa, typ (domáca/zahraničná), doprava, účel, voliteľne preddavok</li>
          <li><strong>Nadriadený</strong> (alebo zastupujúci) schváli/zamietne žiadosť</li>
          <li>Schválená cesta auto-vytvára <strong>dochádzka záznamy</strong> (služobná cesta = odpracovaný čas)</li>
          <li>Zamestnanec vykoná cestu</li>
          <li>Po návrate nahrá <strong>doklady</strong> (hotel, cestovné, stravné) do Storage bucketu &quot;sluzobne-cesty-doklady&quot;</li>
          <li><strong>Admin</strong> skontroluje a schváli/zamietne jednotlivé doklady</li>
          <li>Systém vypočíta <strong>vyúčtovanie</strong>: diéty + schválené doklady - preddavok = výsledok</li>
        </ol>

        <p><strong>Diéty — výpočet podľa legislatívy:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Domáca cesta (SK):</strong> do 5h = 0 €, 5-12h = 7,80 €, nad 12h = 11,60 €</li>
          <li><strong>Zahraničná cesta:</strong> závisí od krajiny a hodín. Do 6h = 0, 6-12h = 50% sadzby, nad 12h = plná sadzba</li>
          <li>Sadzby per krajina sú v tabuľke <code>dieta_sadzby</code> (zatiaľ prázdna — čaká na dáta od firmy)</li>
          <li>Výpočet sa zobrazuje transparentne: &quot;8.5h domáca — 7,80 EUR (5-12h)&quot;</li>
        </ul>

        <p><strong>Doklady review:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Admin vidí nahrané doklady v detaile cesty</li>
          <li>Každý doklad: názov, veľkosť, suma, stav (neskontrolovaný/schválený/zamietnutý)</li>
          <li>Obrázky (JPG/PNG) majú náhľad</li>
          <li>Tlačidlá &quot;Schváliť&quot; / &quot;Zamietnuť&quot; per doklad</li>
          <li>Vyúčtovanie je možné až keď sú všetky doklady skontrolované</li>
        </ul>

        <p><strong>Vyúčtovanie:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Diéty</strong> (auto-výpočet) + <strong>Schválené doklady</strong> (súčet súm) - <strong>Preddavok</strong> = <strong>Výsledok</strong></li>
          <li>Kladný výsledok = <span className="text-green-600 font-semibold">doplatok zamestnancovi</span></li>
          <li>Záporný výsledok = <span className="text-orange-600 font-semibold">zamestnanec vracia preplatenie</span></li>
          <li>Stavy vyúčtovania: čaká na doklady → vyúčtované → uzavreté</li>
        </ul>
      </>
    ),
  },

  // ═══════════════════════════════════════════════════════════
  // 8. ARCHÍV DOKUMENTOV
  // ═══════════════════════════════════════════════════════════
  {
    id: 'archiv',
    title: '8. Archív dokumentov — Kompletná logika',
    content: (
      <>
        <p><strong>Archív</strong> je centrálne úložisko firemných dokumentov s kategóriami, verziovaním a workflow.</p>

        <p><strong>8.1 Kategórie (stromová štruktúra):</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>7 default kategórií: Zmluvy, Faktúry, Interné dokumenty, BOZP, HR dokumenty, Vozový park, Ostatné</li>
          <li>Každá kategória má: názov, farbu, ikonu, <strong>prístupové role</strong></li>
          <li>Prístup per kategória: napr. HR dokumenty vidí len admin/it_admin, Vozový park vidí aj fleet_manager</li>
          <li>Kategórie môžu mať podkategórie (parent_id)</li>
          <li>Sidebar v archíve zobrazuje stromovú štruktúru + počet dokumentov per kategória</li>
        </ul>

        <p><strong>8.2 Upload:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Podporované: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG — max 25MB</li>
          <li>Metadata: názov, typ (faktúra/zmluva/objednávka/dodací list/iné), kategória, tagy, popis, oddelenie</li>
          <li>Pre faktúry: dodávateľ, číslo faktúry, suma, splatnosť</li>
          <li><strong>Hromadný upload:</strong> vyberte viacero súborov naraz — všetky dostanú rovnaké metadata</li>
          <li>Súbory sa ukladajú do Storage bucketu &quot;archiv&quot; v štruktúre rok/mesiac/</li>
          <li><strong>Platnosť do:</strong> voliteľný dátum expirácie (pre zmluvy, certifikáty)</li>
        </ul>

        <p><strong>8.3 Workflow schvaľovania:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Nahraný</strong> → <strong>Čaká na schválenie</strong> → <strong>Schválený</strong> / <strong>Zamietnutý</strong></li>
          <li>Pre faktúry: Schválený → <strong>Na úhradu</strong> → <strong>Uhradený</strong></li>
          <li>Fulltext vyhľadávanie cez PostgreSQL tsvector index</li>
        </ul>

        <p><strong>8.4 Verziovanie:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Každý dokument má pole <code>verzia</code> (default 1) a <code>povodny_dokument_id</code></li>
          <li>Nahratie novej verzie: vytvorí nový záznam s verzia = starý + 1, prepojí cez povodny_dokument_id</li>
          <li>Starý dokument dostane stav &quot;nahradený&quot;</li>
          <li>V detaile dokumentu: &quot;História verzií&quot; — zoznam všetkých verzií s dátumami a kto nahral</li>
          <li>Staré súbory zostávajú v Storage (audit trail)</li>
        </ul>

        <p><strong>8.5 Retenčná politika:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Pole <code>platnost_do</code> na dokumente</li>
          <li>Dashboard widget upozorňuje na dokumenty expirujúce do 30 dní</li>
          <li>Farebné badgy: červená (expirované), oranžová (blíži sa), zelená (OK)</li>
        </ul>
      </>
    ),
  },

  // ═══════════════════════════════════════════════════════════
  // 9. DOCHÁDZKA A DOVOLENKY
  // ═══════════════════════════════════════════════════════════
  {
    id: 'dochadzka',
    title: '9. Dochádzka a dovolenky — Kompletná logika',
    content: (
      <>
        <p><strong>9.1 Dochádzka — tablet PWA:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Zamestnanec príde k tabletu → priloží RFID kartu ALEBO zadá PIN</li>
          <li>Systém zaznamená príchod/odchod s presným časom</li>
          <li>Dôvody: príchod, odchod, lekár, obed, fajčenie, služobná cesta</li>
          <li>PWA funguje offline — záznamy sa synchronizujú</li>
        </ul>

        <p><strong>9.2 Pracovný fond:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Default: 8,5h denne, prestávka sa NEzapočítava</li>
          <li>Týždenný fond: <code>tyzdnovy_fond_hodiny</code> na profile (default 42,5h)</li>
          <li>Pracovné dni: <code>pracovne_dni_tyzdne</code> (default 5)</li>
          <li>Denný fond = týždenný / pracovné_dni</li>
          <li>Sviatky: slovenský štátny kalendár — automaticky</li>
          <li>Prenos hodín: prepadajú koncom roka (nič sa neprenáša)</li>
        </ul>

        <p><strong>9.3 Dovolenky — typy:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Dovolenka</strong> — riadna dovolenka, odpočítava sa z nároku</li>
          <li><strong>PN</strong> (sick_leave) — práceneschopnosť</li>
          <li><strong>OČR</strong> — ošetrovanie člena rodiny</li>
          <li><strong>Náhradné voľno</strong> (nahradne_volno) — čerpanie za nadčas</li>
          <li><strong>Neplatené voľno</strong> (neplatene_volno) — bez mzdy</li>
          <li><strong>Pol dňa dovolenky:</strong> checkbox <code>pol_dna</code> + výber <code>cast_dna</code> (dopoludnie/popoludnie) = 0,5 dňa</li>
        </ul>

        <p><strong>9.4 Nárok na dovolenku:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Automaticky podľa ZP: do 33 rokov = 20 dní, nad 33 rokov = 25 dní</li>
          <li>Vypočítava sa z dátumu narodenia</li>
        </ul>

        <p><strong>9.5 Schvaľovanie:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Žiadosť ide priamemu nadriadenému (<code>profiles.nadriadeny_id</code>)</li>
          <li>Ak je nadriadený dnes na schválenej dovolenke → automaticky sa presmeruje na <code>zastupuje_id</code></li>
          <li>Funkcia <code>resolveCurrentApprover()</code> rieši tento fallback</li>
          <li>Self-approval blokovaný</li>
          <li>Pri deaktivácii zamestnanca sa automaticky zamietnu jeho pending žiadosti</li>
          <li>Pri zmene nadriadeného sa kaskádovo aktualizujú pending žiadosti</li>
        </ul>
      </>
    ),
  },

  // ═══════════════════════════════════════════════════════════
  // 10. ZAMESTNANCI — SPRÁVA
  // ═══════════════════════════════════════════════════════════
  {
    id: 'zamestnanci',
    title: '10. Správa zamestnancov',
    content: (
      <>
        <p><strong>Bulk editor (/admin/zamestnanci):</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Search podľa mena, emailu, pozície</li>
          <li>Filter podľa firmy (+ &quot;bez firmy&quot;)</li>
          <li>Toggle &quot;iba aktívni&quot;</li>
          <li>Inline edit: firma (dropdown), pozícia (text), úväzok (dropdown), fond, PIN, nadriadený</li>
        </ul>

        <p><strong>Detail zamestnanca (/admin/zamestnanci/[id]):</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Oprávnenia:</strong> UserPermissionsSection — rola + 9 modulov s úrovňou prístupu</li>
          <li><strong>Nastavenia:</strong> vozidlo, nadriadený, zastupujúci, PIN, fond hodín, pracovné dni, pozícia, dátum nástupu, typ úväzku</li>
          <li><strong>Majetok:</strong> zoznam prideleného IT vybavenia</li>
          <li><strong>Licencie:</strong> softvérové licencie</li>
          <li><strong>RFID:</strong> prístupové karty</li>
          <li><strong>Školenia:</strong> zoznam + pridanie nového + certifikát upload</li>
          <li><strong>Onboarding/Offboarding:</strong> checklist s progress barom</li>
          <li><strong>Akcie:</strong> Exportovať PDF, Spustiť offboarding, Reset hesla</li>
        </ul>

        <p><strong>Firmy (multi-tenant):</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>8 firiem: IMET a.s. (matka), IMET-TEC a.s., IMET-AKE s.r.o., AKE Skalica s.r.o., ZVL-Ložiská s.r.o., IMET CZ spol. s r.o., Galicia Nueva, IMET KE</li>
          <li>Každá firma: právny názov, kód, mesto, krajina, mena (EUR/CZK), moduly default</li>
          <li>Niektoré firmy majú len dochádzku+dovolenky, iné plný systém</li>
        </ul>
      </>
    ),
  },

  // ═══════════════════════════════════════════════════════════
  // 11. NASTAVENIA
  // ═══════════════════════════════════════════════════════════
  {
    id: 'nastavenia',
    title: '11. Nastavenia systému',
    content: (
      <>
        <p>Nastavenia sú konsolidované na jednej stránke s <strong>4 tabmi</strong>:</p>

        <p><strong>Tab Všeobecné:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Názov firmy (pre hlavičky a PDF)</li>
          <li>Posledné číslo dokladu (auto-increment pri spracovaní jazdy)</li>
          <li>Stravné sadzby (domáce a zahraničné pre rôzne časové pásma)</li>
          <li>DPH sadzba (pre odpočet z PHM)</li>
          <li>Vreckové percento (pre zahraničné cesty)</li>
        </ul>

        <p><strong>Tab Palivá:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Aktuálne ceny: diesel, premium diesel, benzín E10, benzín E5, LPG, elektro</li>
          <li>Tieto ceny sa používajú pri výpočte PHM náhrad v knihe jázd</li>
        </ul>

        <p><strong>Tab Sadzby:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Sadzba za km pre súkromné vozidlo (zákonná sadzba)</li>
          <li>Sadzba za ubytovanie (DPH)</li>
        </ul>

        <p><strong>Tab Systém:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Email (SMTP):</strong> placeholder — keď sa nastaví SMTP_HOST env, systém začne posielať emaily cez O365. Dovtedy sa notifikácie ukladajú len do DB.</li>
          <li><strong>IP Whitelist:</strong> env premenná ADMIN_IP_WHITELIST obmedzuje prístup k /admin/*</li>
          <li><strong>2FA:</strong> placeholder pre Email OTP — pripravené na aktiváciu cez Supabase Auth hooks</li>
        </ul>
      </>
    ),
  },

  // ═══════════════════════════════════════════════════════════
  // 12. REPORTY
  // ═══════════════════════════════════════════════════════════
  {
    id: 'reporty',
    title: '12. Reporty a exporty',
    content: (
      <>
        <p><strong>Admin reporty (/admin/reporty):</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Náklady jázd</strong> — mesačný/ročný prehľad cestovných náhrad per zamestnanec</li>
          <li><strong>Dochádzka</strong> — odpracované hodiny, nadčas, absencie</li>
          <li><strong>Ročný prehľad</strong> — sumárne dáta za rok</li>
          <li><strong>CSV export</strong> — pre mzdárku, endpoint <code>/api/reporty/mzdy?mesiac=YYYY-MM</code></li>
        </ul>

        <p><strong>Fleet reporty (/fleet/reporty):</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Náklady per vozidlo</strong> — servisy + tankovanie + kontroly + poistné za vybraný rok</li>
          <li><strong>KM vodičov</strong> — najazdené km per vodič</li>
          <li><strong>Spotreba</strong> — priemerná L/100km per vozidlo</li>
        </ul>

        <p><strong>PDF exporty:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Cestovný príkaz (per jazda)</li>
          <li>Mesačný sumár jázd (per zamestnanec per mesiac)</li>
          <li>Zamestnanecká karta (kompletný profil)</li>
          <li>Odovzdávací protokol vozidla</li>
        </ul>
      </>
    ),
  },

  // ═══════════════════════════════════════════════════════════
  // 13. NOTIFIKÁCIE A AUDIT
  // ═══════════════════════════════════════════════════════════
  {
    id: 'notifikacie',
    title: '13. Notifikácie a audit log',
    content: (
      <>
        <p><strong>Notifikácie:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Systém vytvára notifikácie v tabuľke <code>notifikacie</code> pri kľúčových udalostiach</li>
          <li>Typy: nova_jazda, jazda_spracovana, jazda_vratena, dovolenka_schvalena, dovolenka_zamietnuta, sluzobna_cesta_schvalena, poistna_udalost, poistna_udalost_zmena</li>
          <li>Zvonček v sidebar ukazuje počet neprečítaných</li>
          <li>Kliknutie na notifikáciu → presmerovanie na detail (link v notifikácii)</li>
          <li>Email: zatiaľ len do DB, po nastavení SMTP sa budú posielať aj emaily</li>
        </ul>

        <p><strong>Audit log:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Funkcia <code>logAudit(akcia, tabulka, entityId, details)</code></li>
          <li>Zaznamenáva: kto, čo, kedy, na čom — napr. &quot;it@imet.sk spracoval jazdu D-0042&quot;</li>
          <li>Typy akcií: spracovanie_jazdy, batch_spracovanie_jazdy, vratenie_jazdy, schvalenie_dovolenky, zamietnutie_dovolenky, schvalenie_cesty, vytvorenie_zamestnanca, zmena_opravneni, upload_dokumentu, pridanie_skolenia, onboarding_started, offboarding_completed, atď.</li>
          <li>Zobrazuje sa na admin dashboarde (posledných 8 záznamov)</li>
        </ul>
      </>
    ),
  },

  // ═══════════════════════════════════════════════════════════
  // 14. BEZPEČNOSŤ
  // ═══════════════════════════════════════════════════════════
  {
    id: 'bezpecnost',
    title: '14. Bezpečnosť a technické detaily',
    content: (
      <>
        <p><strong>Autorizácia:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li><code>requireAuth()</code> — overí že užívateľ je prihlásený</li>
          <li><code>requireAdmin()</code> — vyžaduje rolu admin alebo it_admin</li>
          <li><code>requireFleetOrAdmin()</code> — fleet_manager, admin alebo it_admin</li>
          <li><code>requireFinOrAdmin()</code> — fin_manager, admin alebo it_admin</li>
          <li><code>requireOwnerOrAdmin(ownerId)</code> — vlastník záznamu alebo admin</li>
          <li><code>requireNadriadeny(zamestnanecId)</code> — priamy nadriadený, zastupujúci, alebo it_admin</li>
          <li>Každý server action volá príslušný auth helper na začiatku</li>
        </ul>

        <p><strong>Supabase admin klient:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li><code>createSupabaseAdmin()</code> používa SUPABASE_SERVICE_ROLE_KEY</li>
          <li>Bypasuje RLS — používať LEN pre admin operácie</li>
          <li>NIKDY neexponovaný na klientovi (len v server actions)</li>
        </ul>

        <p><strong>Ďalšie bezpečnostné opatrenia:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Self-approval block — nemôžete si schváliť vlastnú žiadosť</li>
          <li>Cycle detection — pri zmene nadriadeného sa kontrolujú cykly</li>
          <li>Cascade pri zmene managera — pending žiadosti sa prenesú na nového nadriadeného</li>
          <li>Auto-reject pri deaktivácii — pending žiadosti deaktivovaného sa automaticky zamietnu</li>
          <li>GDPR — len deaktivácia profilu, žiadne mazanie (soft delete)</li>
          <li>IP Whitelist (placeholder) — ADMIN_IP_WHITELIST env</li>
          <li>2FA Email OTP (placeholder) — pripravené pre admin/it_admin/fin_manager</li>
        </ul>

        <p><strong>Databáza:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Supabase project: yotjzvykdpxkwfegjrkr</li>
          <li>30+ indexov pre výkon</li>
          <li>FK cascade na dôležitých vzťahoch</li>
          <li>Storage buckety: blocky (bločky jázd), fleet-documents, archiv, sluzobne-cesty-doklady, skolenia-certifikaty</li>
        </ul>
      </>
    ),
  },

  // ═══════════════════════════════════════════════════════════
  // 15. DARK MODE
  // ═══════════════════════════════════════════════════════════
  {
    id: 'dark-mode',
    title: '15. Dark mode a UI',
    content: (
      <>
        <p><strong>Dark mode:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Toggle v sidebar footer (ikona Slnko/Mesiac)</li>
          <li>Ukladá sa do localStorage</li>
          <li>Implementácia: CSS variables s <code>[data-theme=&quot;dark&quot;]</code> selector</li>
          <li>Mení: pozadia, texty, bordery, inputy, tieňe</li>
        </ul>

        <p><strong>Responzívne UI:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Sidebar: na desktop fixný (272px), na mobile hamburger menu s overlay</li>
          <li>Obsah: responzívne grid layouty (1-3 stĺpce podľa šírky)</li>
          <li>Tabuľky: DataTable komponent s search, filter, sort, pagination, CSV export</li>
        </ul>
      </>
    ),
  },
]

export default function AdminManualPage() {
  return <ManualPage title="IMET Interný Systém — Kompletný manuál" sections={sections} />
}
