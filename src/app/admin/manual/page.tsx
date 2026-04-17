import ManualPage, { ManualSection } from '@/components/ManualPage'

const sections: ManualSection[] = [
  {
    id: 'dashboard',
    title: 'Dashboard — Prehľad systému',
    content: (
      <>
        <p>
          <strong>Dashboard</strong> je úvodná stránka administrátorského rozhrania. Poskytuje okamžitý
          prehľad o stave celého systému a upozorňuje na položky vyžadujúce vašu pozornosť.
        </p>

        <p><strong>Metriky na dashboarde:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Jazdy na spracovanie</strong> — počet odoslaných jázd, ktoré čakajú na vaše spracovanie.</li>
          <li><strong>Dovolenky na schválenie</strong> — žiadosti o dovolenku čakajúce na schválenie.</li>
          <li><strong>Nové služobné cesty</strong> — žiadosti o služobné cesty na schválenie.</li>
          <li><strong>Hlásenia</strong> — nové hlásenia problémov s vozidlami od zamestnancov.</li>
          <li><strong>Aktívni zamestnanci</strong> — celkový počet aktívnych zamestnancov v systéme.</li>
        </ul>

        <p>
          <strong>Audit log:</strong> V spodnej časti dashboardu sa zobrazujú posledné akcie v systéme —
          kto čo urobil a kedy. Napríklad: &quot;Ján Novák odoslal jazdu&quot;, &quot;Mária Kováčová schválila
          dovolenku&quot;. Audit log slúži na sledovanie aktivity a riešenie prípadných nezrovnalostí.
        </p>

        <p>
          <strong>Expirácie:</strong> Dashboard upozorňuje na blížiace sa expirácie — STK a emisné
          kontroly vozidiel, platnosť školení zamestnancov, expirácia dokumentov v archíve.
          Položky sú zoradené podľa urgentnosti, aby ste mohli včas konať.
        </p>
      </>
    ),
  },
  {
    id: 'kniha-jazd',
    title: 'Kniha jázd — Spracovanie',
    content: (
      <>
        <p>
          Ako administrátor (účtovníčka) spracovávate jazdy odoslané zamestnancami. Jazdy nájdete
          v menu <strong>&quot;Jazdy&quot;</strong>. Zoznam zobrazuje všetky jazdy so stavom &quot;Odoslaná&quot;,
          ktoré čakajú na vaše spracovanie.
        </p>

        <p><strong>Spracovanie jednotlivej jazdy:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Kliknite na jazdu v zozname pre otvorenie <strong>detailu</strong>.</li>
          <li>Skontrolujte údaje — trasu, kilometre, prílohy (bločky).</li>
          <li>Vyberte <strong>typ jazdy</strong>: firemné vozidlo / súkromné vozidlo, tuzemská / zahraničná.</li>
          <li>Systém automaticky <strong>vypočíta náhrady</strong> na základe aktuálnych sadzieb a cien palív.</li>
          <li>Kliknite <strong>&quot;Spracovať a prideliť č. dokladu&quot;</strong>. Jazde sa pridelí evidenčné číslo a stav sa zmení na &quot;Spracovaná&quot;.</li>
          <li>Zamestnanec dostane notifikáciu o spracovaní.</li>
        </ul>

        <p>
          <strong>Hromadné spracovanie:</strong> Ak potrebujete spracovať viacero jázd naraz, zaškrtnite
          ich v zozname a kliknite <strong>&quot;Spracovať vybrané&quot;</strong>. Systém spracuje všetky vybrané
          jazdy s rovnakými parametrami.
        </p>

        <p>
          <strong>Vrátenie jazdy:</strong> Ak jazda obsahuje chyby (nesprávne km, chýbajúce údaje),
          môžete ju <strong>vrátiť zamestnancovi</strong>. Kliknite &quot;Vrátiť&quot; a napíšte komentár
          s popisom, čo treba opraviť. Zamestnanec dostane notifikáciu a môže jazdu upraviť
          a znovu odoslať.
        </p>

        <p>
          <strong>PDF export:</strong> Po spracovaní jazdy je možné stiahnuť <strong>cestovný príkaz</strong>
          ako PDF dokument. Tiež môžete vygenerovať <strong>mesačný sumár</strong> jázd za konkrétneho
          zamestnanca alebo za celú firmu.
        </p>

        <p>
          <strong>Nastavenia sadzieb:</strong> Ceny palív a sadzby cestovných náhrad nastavíte v menu
          <strong> Nastavenia → Palivá</strong> (aktuálne ceny benzínu, nafty, LPG, CNG, elektriny) a
          <strong> Nastavenia → Sadzby</strong> (sadzba za km pre súkromné vozidlo). Tieto hodnoty sa
          používajú pri výpočte náhrad.
        </p>
      </>
    ),
  },
  {
    id: 'zamestnanci',
    title: 'Zamestnanci',
    content: (
      <>
        <p>
          Správa zamestnancov je jednou z hlavných funkcií administrátorského rozhrania. Zoznam
          zamestnancov nájdete v menu <strong>&quot;Zamestnanci&quot;</strong>.
        </p>

        <p><strong>Vytvorenie nového zamestnanca:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Kliknite na <strong>&quot;Pridať zamestnanca&quot;</strong>.</li>
          <li>Vyplňte základné údaje — meno, priezvisko, e-mail, telefón.</li>
          <li>Nastavte <strong>rolu</strong> v systéme (viď nižšie).</li>
          <li>Priraďte zamestnanca k <strong>firme</strong> (IMET, IMET TEC, atď.).</li>
          <li>Nastavte <strong>nadriadeného</strong> a <strong>zastupujúceho</strong>.</li>
          <li>Uložte zamestnanca.</li>
        </ul>

        <p><strong>Roly v systéme:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>zamestnanec</strong> — bežný zamestnanec, vidí len svoje údaje (jazdy, dovolenky, kartu).</li>
          <li><strong>admin</strong> — účtovníčka, spracováva jazdy, spravuje zamestnancov, schvaľuje dovolenky.</li>
          <li><strong>fleet_manager</strong> — správca vozového parku, spravuje vozidlá, servisy, kontroly.</li>
          <li><strong>fin_manager</strong> — finančná riaditeľka, prístup k reportom a finančným prehľadom.</li>
          <li><strong>it_admin</strong> — plný prístup ku všetkým modulom a nastaveniam systému.</li>
        </ul>

        <p>
          <strong>Module permissions:</strong> Pre každého zamestnanca môžete nastaviť podrobné prístupové
          práva k jednotlivým modulom. V detaile zamestnanca nájdete sekciu <strong>&quot;Oprávnenia modulov&quot;</strong>,
          kde pre každý modul (Jazdy, Vozový park, Dochádzka, atď.) nastavíte úroveň prístupu:
          <strong> view</strong> (len čítanie), <strong>edit</strong> (čítanie a zápis), alebo
          <strong> admin</strong> (plná správa).
        </p>

        <p><strong>Onboarding nového zamestnanca:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Pri vytvorení nového zamestnanca sa zobrazí <strong>onboarding checklist</strong>.</li>
          <li>Checklist obsahuje kroky: BOZP školenie, pridelenie majetku (notebook, telefón), vydanie kariet, nastavenie prístupov.</li>
          <li>Každý krok môžete označiť ako splnený. Systém sleduje postup onboardingu.</li>
        </ul>

        <p><strong>Offboarding odchádzajúceho zamestnanca:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Pri odchode zamestnanca spustite <strong>offboarding workflow</strong>.</li>
          <li>Workflow zahŕňa: vrátenie majetku, odovzdanie kariet, deaktivácia prístupov, odovzdanie vozidla.</li>
          <li>Po dokončení všetkých krokov sa zamestnanec deaktivuje v systéme.</li>
        </ul>

        <p><strong>Ďalšie priradenia:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Vozidlo</strong> — priraďte firemné vozidlo zamestnancovi.</li>
          <li><strong>Nadriadený</strong> — nastavte priameho nadriadeného pre schvaľovanie dovoleniek a ciest.</li>
          <li><strong>Zastupujúci</strong> — nastavte zastupujúceho pre prípad neprítomnosti nadriadeného.</li>
          <li><strong>Firma</strong> — priraďte k správnej firme.</li>
          <li><strong>Úväzok a fond hodín</strong> — nastavte pracovný úväzok (plný/čiastočný) a mesačný fond hodín.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'vozovy-park',
    title: 'Vozový park',
    content: (
      <>
        <p>
          Modul <strong>Vozový park</strong> slúži na kompletnú správu firemných vozidiel. V menu
          nájdete sekciu <strong>&quot;Vozidlá&quot;</strong> s prehľadom všetkých vozidiel.
        </p>

        <p><strong>Vozidlá — správa:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Pridanie vozidla:</strong> Kliknite &quot;Pridať vozidlo&quot;, vyplňte značku, model, ŠPZ, VIN, rok výroby, typ paliva, objem nádrže.</li>
          <li><strong>Úprava:</strong> V detaile vozidla môžete upraviť všetky údaje.</li>
          <li><strong>Stavy vozidla:</strong> Aktívne (v prevádzke), V servise (dočasne odstavené), Vyradené (trvalo vyradené z prevádzky).</li>
        </ul>

        <p>
          <strong>Servisy:</strong> V sekcii &quot;Servisy&quot; evidujete všetky servisné zásahy — bežné
          údržby (olej, filtre, brzdy), opravy, výmena pneumatík. Pri každom servise uveďte
          dátum, popis prác, cenu, servisný partner. Nastavte interval ďalšieho servisu
          (napr. každých 15 000 km alebo 12 mesiacov).
        </p>

        <p>
          <strong>Kontroly STK, EK, PZP, havarijné poistenie:</strong> Evidujte dátumy platnosti všetkých
          povinných kontrol a poistení. Systém automaticky upozorňuje na blížiace sa expirácie
          — 30 dní, 14 dní a 7 dní pred vypršaním platnosti.
        </p>

        <p>
          <strong>Zdieľané vozidlá:</strong> Jedno vozidlo môže byť priradené viacerým vodičom. V detaile
          vozidla nastavíte <strong>primárneho vodiča</strong> a ďalších vodičov, ktorí môžu vozidlo používať.
        </p>

        <p>
          <strong>Tachometer:</strong> Mesačné záznamy stavu tachometra. Evidujú sa automaticky na základe
          zaznamenaných jázd, ale môžete ich aj manuálne upraviť.
        </p>

        <p>
          <strong>Tankovanie:</strong> Záznamy o tankovaní — dátum, množstvo litrov, cena, čerpacia stanica.
          Systém automaticky počíta <strong>priemernú spotrebu L/100km</strong> na základe najazdených km
          a natankovaného paliva.
        </p>

        <p>
          <strong>Tankové karty:</strong> Evidencia palivových kariet (Shell, OMV, Slovnaft). Pri každej
          karte sa eviduje číslo karty, priradené vozidlo/vodič a platnosť.
        </p>

        <p><strong>Poistné udalosti — workflow:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Nahlásená</strong> — zamestnanec nahlásil udalosť.</li>
          <li><strong>Riešená</strong> — fleet manager prevzal riešenie, zbiera podklady.</li>
          <li><strong>U poisťovne</strong> — podklady odoslané poisťovni, čaká sa na vyjadrenie.</li>
          <li><strong>Vyriešená</strong> — poisťovňa rozhodla, udalosť uzavretá.</li>
        </ul>

        <p>
          <strong>Náklady per vozidlo:</strong> V reportoch vidíte celkové náklady na každé vozidlo —
          súčet servisov, paliva, kontrol (STK, EK), poistného a ďalších výdavkov. Report pomáha
          vyhodnotiť ekonomickú efektívnosť jednotlivých vozidiel.
        </p>
      </>
    ),
  },
  {
    id: 'sluzobne-cesty',
    title: 'Služobné cesty',
    content: (
      <>
        <p>
          V module <strong>Služobné cesty</strong> spravujete žiadosti zamestnancov o služobné cesty,
          schvaľujete doklady a vykonávate vyúčtovanie.
        </p>

        <p>
          <strong>Schvaľovanie žiadostí:</strong> V zozname služobných ciest vidíte všetky žiadosti
          so stavom &quot;Čaká na schválenie&quot;. Otvorte detail žiadosti, skontrolujte údaje (dátumy,
          trasa, účel, dopravný prostriedok, preddavok) a kliknite <strong>&quot;Schváliť&quot;</strong>
          alebo <strong>&quot;Zamietnuť&quot;</strong> s uvedením dôvodu.
        </p>

        <p>
          <strong>Review dokladov:</strong> Po návrate zamestnanca z cesty skontrolujte nahrané doklady.
          Každý doklad môžete individuálne <strong>schváliť</strong> alebo <strong>zamietnuť</strong>
          (napr. ak doklad nie je čitateľný alebo nesúvisí s cestou).
        </p>

        <p><strong>Vyúčtovanie služobnej cesty:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Diéty</strong> — systém automaticky vypočíta diéty podľa zákona (závisí od krajiny, dĺžky cesty, poskytnutého stravovania).</li>
          <li><strong>Schválené doklady</strong> — súčet schválených dokladov (hotel, cestovné, parkovné, atď.).</li>
          <li><strong>Preddavok</strong> — suma vyplateného preddavku pred cestou.</li>
          <li><strong>Výsledok</strong> = diéty + doklady - preddavok. Kladná suma = vyplatiť zamestnancovi. Záporná suma = zamestnanec vracia.</li>
        </ul>

        <p><strong>Stavy služobnej cesty:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Čaká na doklady</strong> — cesta schválená, zamestnanec ešte nenahral doklady.</li>
          <li><strong>Vyúčtované</strong> — admin vykonal vyúčtovanie.</li>
          <li><strong>Uzavreté</strong> — cesta je kompletne uzavretá.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'archiv-dokumentov',
    title: 'Archív dokumentov',
    content: (
      <>
        <p>
          <strong>Archív dokumentov</strong> je centrálne úložisko firemných dokumentov. Umožňuje
          organizované ukladanie, verziovanie a riadenie prístupu k dokumentom.
        </p>

        <p><strong>Kategórie dokumentov:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Zmluvy</strong> — pracovné zmluvy, dodávateľské zmluvy, nájomné zmluvy</li>
          <li><strong>Faktúry</strong> — prijaté a vydané faktúry</li>
          <li><strong>Interné</strong> — interné smernice, nariadenia, procesy</li>
          <li><strong>BOZP</strong> — dokumenty bezpečnosti a ochrany zdravia pri práci</li>
          <li><strong>HR</strong> — personálne dokumenty, mzdové podklady</li>
          <li><strong>Vozový park</strong> — technické preukazy, poistky, servisné protokoly</li>
          <li><strong>Ostatné</strong> — dokumenty nezaradené do inej kategórie</li>
        </ul>

        <p>
          <strong>Upload dokumentov:</strong> Dokumenty môžete nahrávať jednotlivo alebo hromadne.
          Kliknite <strong>&quot;Nahrať dokument&quot;</strong>, vyberte súbor(y), zvoľte kategóriu,
          zadajte názov a voliteľný popis. Podporované formáty: PDF, DOC, DOCX, XLS, XLSX,
          JPG, PNG.
        </p>

        <p><strong>Schvaľovanie dokumentov — workflow:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Nahraný</strong> — dokument bol nahraný, čaká na schválenie.</li>
          <li><strong>Schválený</strong> — admin skontroloval a schválil dokument.</li>
          <li><strong>Zamietnutý</strong> — dokument bol zamietnutý (nesprávna kategória, nečitateľný, atď.).</li>
        </ul>

        <p>
          <strong>Verziovanie:</strong> Pri nahratí novej verzie existujúceho dokumentu sa pôvodná
          verzia zachová v histórii. Môžete sa kedykoľvek pozrieť na staršie verzie a porovnať zmeny.
          Napríklad pri aktualizácii internej smernice nahráte novú verziu a stará zostane dostupná.
        </p>

        <p>
          <strong>Retenčná politika:</strong> Pre každý dokument môžete nastaviť <strong>platnosť do</strong>
          (dátum expirácie). Systém automaticky upozorňuje na dokumenty, ktorým sa blíži koniec
          platnosti — napríklad zmluva, poistka, certifikát. Upozornenia sa zobrazujú na dashboarde.
        </p>

        <p>
          <strong>Prístupové práva:</strong> Prístup k dokumentom je riadený podľa <strong>kategórií a rolí</strong>.
          Napríklad HR dokumenty vidí len admin a HR, vozový park dokumenty vidí aj fleet manager.
          Nastavenia prístupu nájdete v administrácii archívu.
        </p>
      </>
    ),
  },
  {
    id: 'dovolenky-dochadzka',
    title: 'Dovolenky a dochádzka',
    content: (
      <>
        <p>
          Ako admin schvaľujete žiadosti o dovolenku a spravujete dochádzku zamestnancov.
        </p>

        <p><strong>Schvaľovanie dovoleniek:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>V menu <strong>&quot;Dovolenky&quot;</strong> vidíte zoznam žiadostí na schválenie.</li>
          <li>Pri každej žiadosti vidíte: meno zamestnanca, typ voľna, dátumy, počet dní, zostávajúci nárok.</li>
          <li>Kliknite <strong>&quot;Schváliť&quot;</strong> alebo <strong>&quot;Zamietnuť&quot;</strong>. Pri zamietnutí uveďte dôvod.</li>
          <li>Zamestnanec dostane notifikáciu o rozhodnutí.</li>
        </ul>

        <p><strong>Typy voľna:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Dovolenka</strong> — riadna dovolenka, odpočítava sa z nároku.</li>
          <li><strong>PN</strong> — práceneschopnosť, eviduje sa bez odpočítania z dovolenky.</li>
          <li><strong>OČR</strong> — ošetrovanie člena rodiny.</li>
          <li><strong>Náhradné voľno</strong> — čerpanie za odpracovaný nadčas.</li>
          <li><strong>Neplatené voľno</strong> — voľno bez nároku na mzdu.</li>
          <li><strong>Pol dňa</strong> — dovolenka len na doobede alebo poobede (0,5 dňa).</li>
        </ul>

        <p>
          <strong>Zastupovanie:</strong> Ak je priamy nadriadený zamestnanca na dovolenke, žiadosť
          sa automaticky presmeruje na <strong>zastupujúceho</strong>, ktorý je nastavený v profile
          nadriadeného. Tento mechanizmus zabezpečuje, že žiadosti nikdy nezostanú neschválené.
        </p>

        <p>
          <strong>Reporty dochádzky:</strong> V sekcii <strong>&quot;Dochádzka&quot;</strong> nájdete prehľad
          dochádzky všetkých zamestnancov. Môžete filtrovať podľa mesiaca, oddelenia alebo
          zamestnanca. Report zobrazuje príchody, odchody, odpracované hodiny, nadčas a absencie.
        </p>
      </>
    ),
  },
  {
    id: 'nastavenia',
    title: 'Nastavenia',
    content: (
      <>
        <p>
          V sekcii <strong>Nastavenia</strong> konfigurujete systémové parametre, ktoré ovplyvňujú
          výpočty a fungovanie celého systému.
        </p>

        <p><strong>Všeobecné nastavenia:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Názov firmy</strong> — zobrazuje sa v hlavičke a na dokumentoch.</li>
          <li><strong>Stravné sadzby</strong> — denné sadzby stravného pre tuzemské a zahraničné cesty.</li>
          <li><strong>DPH</strong> — aktuálna sadzba DPH pre výpočty.</li>
        </ul>

        <p><strong>Palivá:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Nastavte aktuálne ceny palív — <strong>benzín, nafta, LPG, CNG, elektrina</strong>.</li>
          <li>Ceny sa používajú pri výpočte cestovných náhrad za jazdy firemným vozidlom.</li>
          <li>Aktualizujte ceny pravidelne podľa štatistického úradu alebo skutočných cien.</li>
        </ul>

        <p><strong>Sadzby:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Sadzba za km pre súkromné vozidlo</strong> — zákonná sadzba za použitie vlastného vozidla na služobné účely.</li>
          <li>Aktualizujte podľa platnej legislatívy (zákon o cestovných náhradách).</li>
        </ul>

        <p><strong>Systémové nastavenia:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>SMTP</strong> — konfigurácia e-mailového servera pre odosielanie notifikácií (placeholder pre budúcu implementáciu).</li>
          <li><strong>IP whitelist</strong> — zoznam povolených IP adries pre prístup do systému (placeholder).</li>
          <li><strong>2FA</strong> — dvojfaktorová autentifikácia (placeholder pre budúcu implementáciu).</li>
        </ul>
      </>
    ),
  },
  {
    id: 'reporty',
    title: 'Reporty',
    content: (
      <>
        <p>
          Modul <strong>Reporty</strong> poskytuje súhrnné prehľady a exporty dát pre účtovníctvo,
          mzdové oddelenie a vedenie firmy.
        </p>

        <p><strong>Mesačné reporty jázd:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Report jázd per zamestnanec za vybraný mesiac.</li>
          <li>Obsahuje: počet jázd, celkové km, suma náhrad, typ vozidla.</li>
          <li>Možnosť exportu do <strong>PDF</strong> (cestovný príkaz) alebo <strong>CSV</strong>.</li>
          <li>Sumárny report za celú firmu — pre mesačnú uzávierku.</li>
        </ul>

        <p><strong>Reporty dochádzky:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Mesačný prehľad dochádzky per zamestnanec.</li>
          <li>Odpracované hodiny, nadčas, absencie, dovolenky.</li>
          <li>Export pre mzdárku — <strong>CSV</strong> s údajmi potrebnými pre výpočet mzdy.</li>
        </ul>

        <p><strong>Fleet reporty:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Náklady per vozidlo</strong> — servisy, palivo, kontroly, poistenie. Celkový TCO (Total Cost of Ownership).</li>
          <li><strong>Km vodičov</strong> — najazdené kilometre per vodič za obdobie.</li>
          <li><strong>Spotreba</strong> — priemerná spotreba L/100km per vozidlo.</li>
          <li><strong>Expirácie</strong> — prehľad blížiacich sa a expirovaných kontrol.</li>
        </ul>

        <p>
          <strong>CSV export pre mzdárku:</strong> Špeciálny export formátovaný pre import do mzdového
          softvéru. Obsahuje ID zamestnanca, odpracované hodiny, nadčas, dovolenky, PN,
          cestovné náhrady. Kliknite <strong>&quot;Export CSV&quot;</strong> a vyberte mesiac.
        </p>
      </>
    ),
  },
]

export default function AdminManualPage() {
  return <ManualPage title="Návod pre administrátora" sections={sections} />
}
