import ManualPage, { ManualSection } from '@/components/ManualPage'

const sections: ManualSection[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    content: (
      <>
        <p>
          <strong>Fleet dashboard</strong> je vaša hlavná stránka, ktorá poskytuje okamžitý prehľad
          o stave celého vozového parku. Po prihlásení uvidíte najdôležitejšie informácie
          na jednom mieste.
        </p>

        <p><strong>Čo nájdete na dashboarde:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Celkový počet vozidiel</strong> — koľko vozidiel je v parku, rozdelené podľa stavu (aktívne, v servise, vyradené).</li>
          <li><strong>Blížiace sa kontroly</strong> — vozidlá, ktorým čoskoro vyprší STK, EK, PZP alebo havarijné poistenie. Zoradené podľa urgentnosti.</li>
          <li><strong>Plánované servisy</strong> — vozidlá, ktoré sa blížia k servisnému intervalu (podľa km alebo dátumu).</li>
          <li><strong>Nové hlásenia</strong> — problémy nahlásené vodičmi, ktoré ešte neboli riešené.</li>
          <li><strong>Poistné udalosti</strong> — otvorené poistné udalosti a ich aktuálny stav.</li>
        </ul>

        <p>
          Dashboard je navrhnutý tak, aby ste na prvý pohľad videli, čo vyžaduje vašu
          okamžitú pozornosť. Červené a oranžové indikátory upozorňujú na urgentné záležitosti
          (expirované kontroly, kritické hlásenia).
        </p>

        <p>
          Kliknutím na ľubovoľnú metriku sa dostanete priamo na príslušný detail — napríklad
          kliknutie na &quot;Blížiace sa STK&quot; vás presmeruje na zoznam vozidiel s filtrom na STK.
        </p>
      </>
    ),
  },
  {
    id: 'vozidla',
    title: 'Vozidlá',
    content: (
      <>
        <p>
          Správa vozidiel je jadrom fleet modulu. V menu kliknite na <strong>&quot;Vozidlá&quot;</strong>
          pre zobrazenie zoznamu všetkých firemných vozidiel.
        </p>

        <p><strong>Pridanie nového vozidla:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Kliknite na <strong>&quot;Pridať vozidlo&quot;</strong>.</li>
          <li>Vyplňte <strong>základné údaje</strong>: značka, model, ŠPZ, VIN (identifikačné číslo vozidla), rok výroby.</li>
          <li>Nastavte <strong>typ paliva</strong>: benzín, nafta, LPG, CNG, elektro, hybrid.</li>
          <li>Zadajte <strong>objem nádrže</strong> v litroch a <strong>aktuálny stav tachometra</strong>.</li>
          <li>Voliteľne: farba, počet sedadiel, nosnosť, výkon motora.</li>
          <li>Kliknite <strong>&quot;Uložiť&quot;</strong>.</li>
        </ul>

        <p><strong>Úprava vozidla:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>V zozname kliknite na vozidlo pre otvorenie detailu.</li>
          <li>Kliknite <strong>&quot;Upraviť&quot;</strong> a zmeňte potrebné údaje.</li>
          <li>Po úprave kliknite <strong>&quot;Uložiť zmeny&quot;</strong>.</li>
        </ul>

        <p><strong>Stavy vozidla:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Aktívne</strong> — vozidlo je v bežnej prevádzke, priradené vodičovi/vodičom.</li>
          <li><strong>V servise</strong> — vozidlo je dočasne odstavené kvôli servisu alebo oprave. Vodič je informovaný.</li>
          <li><strong>Vyradené</strong> — vozidlo bolo trvalo vyradené z prevádzky (predaj, totálna škoda, koniec leasingu).</li>
        </ul>

        <p>
          V detaile vozidla nájdete všetky súvisiace informácie na jednom mieste — priradení
          vodiči, história servisov, kontroly, tankovania, najazdené km a náklady.
        </p>
      </>
    ),
  },
  {
    id: 'vodici-zdielane',
    title: 'Vodiči a zdieľané vozidlá',
    content: (
      <>
        <p>
          Každé vozidlo môže byť priradené jednému alebo viacerým vodičom. Správne priradenie
          vodičov je dôležité pre evidenciu jázd a zodpovednosť za vozidlo.
        </p>

        <p><strong>Priradenie vodiča k vozidlu:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Otvorte detail vozidla.</li>
          <li>V sekcii <strong>&quot;Vodiči&quot;</strong> kliknite <strong>&quot;Pridať vodiča&quot;</strong>.</li>
          <li>Vyhľadajte zamestnanca podľa mena.</li>
          <li>Označte, či ide o <strong>primárneho vodiča</strong> (hlavný používateľ vozidla) alebo sekundárneho.</li>
          <li>Uložte priradenie.</li>
        </ul>

        <p>
          <strong>Primárny vodič</strong> je zamestnanec, ktorý vozidlo používa najčastejšie a je za
          neho primárne zodpovedný. Každé vozidlo by malo mať práve jedného primárneho vodiča.
          Sekundárni vodiči môžu vozidlo používať príležitostne (napr. pri služobných cestách,
          zastupovaní).
        </p>

        <p>
          <strong>Zdieľané vozidlá:</strong> Niektoré vozidlá sú zdieľané medzi viacerými zamestnancami
          (napr. poolové autá). V tomto prípade nemusia mať primárneho vodiča — všetci vodiči
          sú rovnocenní. Pri zdieľaných vozidlách je obzvlášť dôležité sledovať stav tachometra
          a tankovania.
        </p>

        <p>
          <strong>História priradení:</strong> Systém eviduje históriu priradení vodičov k vozidlám.
          Vidíte, kto mal vozidlo priradené v minulosti, odkedy dokedy. Toto je užitočné
          pri riešení zodpovednosti za škody alebo porušenia.
        </p>

        <p>
          <strong>Odobratie vodiča:</strong> V sekcii &quot;Vodiči&quot; kliknite na ikonu odstránenia pri
          vodičovi, ktorého chcete odobrať. Vodič stratí prístup k vozidlu vo svojom profile,
          ale historický záznam zostane zachovaný.
        </p>
      </>
    ),
  },
  {
    id: 'servisy',
    title: 'Servisy a opravy',
    content: (
      <>
        <p>
          Evidencia servisov je kľúčová pre udržanie vozidiel v dobrom technickom stave
          a pre plánovanie údržby. Servisné záznamy nájdete v menu <strong>&quot;Servisy&quot;</strong>
          alebo v detaile konkrétneho vozidla.
        </p>

        <p><strong>Pridanie servisného záznamu:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Kliknite na <strong>&quot;Pridať servis&quot;</strong>.</li>
          <li>Vyberte <strong>vozidlo</strong>, ku ktorému servis patrí.</li>
          <li>Zadajte <strong>dátum servisu</strong> a <strong>stav tachometra</strong> pri servise.</li>
          <li>Popíšte <strong>vykonané práce</strong> — výmena oleja, filtrov, brzdových platničiek, pneumatík, oprava závady, atď.</li>
          <li>Uveďte <strong>celkovú cenu</strong> servisu vrátane DPH.</li>
          <li>Zadajte <strong>servisný partner</strong> — názov servisu, kde boli práce vykonané.</li>
          <li>Voliteľne nahrajte <strong>prílohy</strong> — faktúru, servisný protokol.</li>
        </ul>

        <p><strong>Plánovanie nasledujúceho servisu:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Pri uložení servisu môžete nastaviť <strong>interval ďalšieho servisu</strong>.</li>
          <li><strong>Podľa km</strong> — napr. každých 15 000 km. Systém sleduje najazdené km a upozorní, keď sa vozidlo blíži k intervalu.</li>
          <li><strong>Podľa času</strong> — napr. každých 12 mesiacov. Systém upozorní podľa dátumu.</li>
          <li>Upozornenia sa zobrazujú na dashboarde fleet managera.</li>
        </ul>

        <p>
          <strong>Typy servisov:</strong> Rozlišujeme bežnú údržbu (pravidelný servis podľa
          predpísaného intervalu), neplánovanú opravu (závada, ktorú treba riešiť okamžite),
          sezónne práce (výmena pneumatík, príprava na zimu/leto) a karosársku opravu (oprava
          poškodenia karosérie po nehode).
        </p>

        <p>
          <strong>História servisov:</strong> V detaile vozidla vidíte kompletnú históriu všetkých
          servisov zoradenú chronologicky. Toto vám pomáha sledovať vzorce — napríklad
          opakujúce sa problémy, ktoré môžu naznačovať systémovú závadu.
        </p>
      </>
    ),
  },
  {
    id: 'kontroly',
    title: 'Kontroly STK/EK/PZP',
    content: (
      <>
        <p>
          Modul kontroly slúži na evidenciu povinných kontrol a poistení vozidiel. Každé
          vozidlo musí mať platné <strong>STK</strong> (stanica technickej kontroly),
          <strong> EK</strong> (emisná kontrola), <strong>PZP</strong> (povinné zmluvné poistenie)
          a voliteľne <strong>havarijné poistenie</strong>.
        </p>

        <p><strong>Evidencia kontrol:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>V detaile vozidla nájdete sekciu <strong>&quot;Kontroly&quot;</strong>.</li>
          <li>Pri každej kontrole vidíte <strong>typ</strong>, <strong>dátum vykonania</strong> a <strong>dátum platnosti do</strong>.</li>
          <li>Pridajte novú kontrolu kliknutím na <strong>&quot;Pridať kontrolu&quot;</strong> — vyberte typ, zadajte dátumy.</li>
          <li>Nahrajte prílohu — protokol o STK/EK, poistnú zmluvu.</li>
        </ul>

        <p><strong>Automatické notifikácie o expirácii:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>30 dní pred expíráciou</strong> — informačné upozornenie, začnite plánovať.</li>
          <li><strong>14 dní pred expíráciou</strong> — naliehavé upozornenie, zabezpečte termín.</li>
          <li><strong>7 dní pred expíráciou</strong> — kritické upozornenie, okamžitá akcia nutná.</li>
          <li><strong>Po expirácii</strong> — vozidlo je označené ako &quot;s expirovanou kontrolou&quot; na dashboarde.</li>
        </ul>

        <p>
          Upozornenia na expirácie sa zobrazujú na fleet dashboarde a v zozname vozidiel.
          Vozidlá s expirovanými kontrolami sú vizuálne odlíšené (červený indikátor), aby ste
          ich okamžite identifikovali.
        </p>

        <p>
          <strong>Plánovanie:</strong> Odporúčame udržiavať si prehľad o všetkých blížiacich sa
          kontrolách aspoň mesiac vopred. Využite zoznam kontrol v menu <strong>&quot;Kontroly&quot;</strong>,
          kde môžete filtrovať podľa typu kontroly a zoradiť podľa dátumu platnosti.
        </p>

        <p>
          <strong>Tip:</strong> STK a EK sa zvyčajne robia súčasne na rovnakej stanici. PZP
          a havarijné poistenie majú vlastné termíny platnosti. Sledujte všetky typy kontrol
          nezávisle.
        </p>
      </>
    ),
  },
  {
    id: 'tachometer',
    title: 'Tachometer',
    content: (
      <>
        <p>
          Evidencia stavu tachometra je dôležitá pre výpočet náhrad, plánovanie servisov
          a kontrolu spotreby paliva. Systém eviduje <strong>mesačné záznamy</strong> stavu
          tachometra pre každé vozidlo.
        </p>

        <p><strong>Ako sa záznamy vytvárajú:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Záznamy sa primárne vytvárajú <strong>automaticky</strong> na základe jázd zaznamenaných v knihe jázd. Keď zamestnanec zadá jazdu s km, systém aktualizuje stav tachometra.</li>
          <li>Ak je potrebná <strong>manuálna korekcia</strong> (napr. nesúlad medzi knihou jázd a skutočným stavom), môžete stav upraviť v detaile vozidla → sekcia &quot;Tachometer&quot;.</li>
        </ul>

        <p><strong>Konzistencia s jazdami:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Systém porovnáva stav tachometra so súčtom jázd za dané obdobie.</li>
          <li>Ak je <strong>rozdiel</strong> medzi stavom tachometra a súčtom km z jázd, systém na to upozorní.</li>
          <li>Dôvody rozdielu môžu byť: súkromné jazdy (nezadané do knihy jázd), chyba v zázname, servisná jazda.</li>
          <li>Overte dôvod rozdielu s vodičom a prípadne vytvorte doplňujúci záznam.</li>
        </ul>

        <p>
          <strong>Mesačný prehľad:</strong> Pre každé vozidlo vidíte graf najazdených km po mesiacoch.
          Toto vám pomáha identifikovať nezvyčajné vzorce — napríklad náhly nárast km, dlhodobý
          pokles využitia vozidla, alebo rozdiely medzi vodičmi.
        </p>

        <p>
          <strong>Tip:</strong> Odporúčame, aby vodiči na konci každého mesiaca odfotili stav
          tachometra. V prípade sporu máte fotografický dôkaz o skutočnom stave.
        </p>
      </>
    ),
  },
  {
    id: 'tankovanie',
    title: 'Tankovanie a spotreba',
    content: (
      <>
        <p>
          Modul tankovania slúži na evidenciu všetkých tankovaní firemných vozidiel a výpočet
          priemernej spotreby paliva.
        </p>

        <p><strong>Pridanie záznamu o tankovaní:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>V detaile vozidla → sekcia &quot;Tankovanie&quot; kliknite <strong>&quot;Pridať tankovanie&quot;</strong>.</li>
          <li>Zadajte <strong>dátum</strong> tankovania.</li>
          <li>Uveďte <strong>množstvo</strong> natankovaného paliva v litroch.</li>
          <li>Zadajte <strong>celkovú cenu</strong> tankovania.</li>
          <li>Vyberte <strong>čerpaciu stanicu</strong> (Shell, OMV, Slovnaft, iná).</li>
          <li>Zadajte <strong>stav tachometra</strong> pri tankovaní.</li>
          <li>Voliteľne nahrajte <strong>bločok</strong> z tankovania.</li>
        </ul>

        <p><strong>Výpočet priemernej spotreby:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Systém automaticky počíta <strong>priemernú spotrebu L/100km</strong> na základe natankovaného množstva a najazdených km medzi tankovaniami.</li>
          <li>Pre presný výpočet je dôležité <strong>vždy tankovat do plna</strong> a zaznamenať stav tachometra.</li>
          <li>Spotreba sa zobrazuje v detaile vozidla a v fleet reportoch.</li>
          <li>Nezvyčajne vysoká spotreba môže naznačovať technický problém s vozidlom.</li>
        </ul>

        <p><strong>Tankové karty:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>V sekcii <strong>&quot;Tankové karty&quot;</strong> evidujete firemné palivové karty.</li>
          <li>Podporované typy: <strong>Shell Card, OMV Card, Slovnaft Card</strong> a ďalšie.</li>
          <li>Pri každej karte sa eviduje: <strong>číslo karty</strong>, priradené <strong>vozidlo alebo vodič</strong>, <strong>platnosť</strong>.</li>
          <li>Tankovania cez tankové karty je možné spárovať s výpismi od dodávateľa.</li>
        </ul>

        <p>
          <strong>Mesačný prehľad:</strong> V reportoch vidíte celkové náklady na palivo per vozidlo,
          priemernú spotrebu a porovnanie s predchádzajúcimi mesiacmi. Toto vám pomáha
          identifikovať vozidlá s nadmernou spotrebou a optimalizovať náklady na prevádzku.
        </p>
      </>
    ),
  },
  {
    id: 'hlasenia',
    title: 'Hlásenia a poistné udalosti',
    content: (
      <>
        <p>
          Zamestnanci môžu nahlasovať problémy s vozidlami a poistné udalosti priamo v systéme.
          Ako fleet manager ste zodpovedný za ich riešenie.
        </p>

        <p><strong>Hlásenia problémov:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Keď zamestnanec nahlási problém, dostanete <strong>notifikáciu</strong>.</li>
          <li>V menu <strong>&quot;Hlásenia&quot;</strong> vidíte zoznam všetkých hlásení.</li>
          <li>Pri každom hlásení vidíte: vozidlo, vodič, dátum, popis problému, prílohy (fotografie).</li>
          <li>Otvorte hlásenie a <strong>zmeňte stav</strong>: Nové → V riešení → Vyriešené.</li>
          <li>Pridajte <strong>komentár</strong> s informáciou o riešení (objednaný servis, termín opravy, atď.).</li>
          <li>Vodič je informovaný o zmene stavu a komentároch.</li>
        </ul>

        <p><strong>Poistné udalosti — workflow:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Nahlásená</strong> — zamestnanec vyplnil formulár poistnej udalosti (dátum, miesto, popis, svedkovia, fotografie).</li>
          <li><strong>Riešená</strong> — fleet manager prevzal udalosť. V tomto štádiu zbierajte podklady: policajný protokol (ak bol), fotodokumentáciu, vyjadrenie vodiča, kontakty na protistranu.</li>
          <li><strong>U poisťovne</strong> — podklady boli odoslané poisťovni. Sledujte komunikáciu s poisťovňou a prípadné dožiadania.</li>
          <li><strong>Vyriešená</strong> — poisťovňa rozhodla o plnení. Zaznamenajte výsledok: výška plnenia, spoluúčasť, škoda na vozidle, oprava.</li>
        </ul>

        <p><strong>Finančné údaje poistnej udalosti:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Odhadovaná škoda</strong> — predbežný odhad nákladov na opravu.</li>
          <li><strong>Skutočná škoda</strong> — konečná suma podľa faktúry za opravu.</li>
          <li><strong>Plnenie poisťovne</strong> — suma, ktorú uhradila poisťovňa.</li>
          <li><strong>Spoluúčasť</strong> — suma, ktorú hradí firma.</li>
          <li>Tieto údaje sa premietajú do celkových nákladov na vozidlo v reportoch.</li>
        </ul>

        <p>
          <strong>Tip:</strong> Pri poistných udalostiach konajte rýchlo. Väčšina poisťovní vyžaduje
          nahlásenie do 15 dní od udalosti. Zdokumentujte všetko — fotografie poškodenia,
          miesta nehody, evidenčné čísla zúčastnených vozidiel.
        </p>
      </>
    ),
  },
  {
    id: 'reporty',
    title: 'Reporty',
    content: (
      <>
        <p>
          Fleet reporty poskytujú analytický pohľad na náklady, využitie a stav vozového parku.
          V menu kliknite na <strong>&quot;Reporty&quot;</strong>.
        </p>

        <p><strong>Náklady per vozidlo:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Celkové náklady na každé vozidlo za vybrané obdobie.</li>
          <li>Rozdelené podľa kategórií: <strong>servisy a opravy</strong>, <strong>palivo</strong>, <strong>kontroly (STK, EK)</strong>, <strong>poistné (PZP, havarijné)</strong>, <strong>poistné udalosti (spoluúčasť)</strong>.</li>
          <li>Porovnanie nákladov medzi vozidlami — identifikácia najdrahších vozidiel.</li>
          <li>Trend nákladov po mesiacoch — rastú, klesajú, stabilné?</li>
          <li>Export do <strong>CSV</strong> alebo <strong>PDF</strong>.</li>
        </ul>

        <p><strong>Kilometre vodičov:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Najazdené km per vodič za vybrané obdobie.</li>
          <li>Rozdelenie na služobné a prípadné súkromné jazdy.</li>
          <li>Porovnanie medzi vodičmi — kto jazdí najviac, kto najmenej.</li>
          <li>Mesačný trend — sezónne výkyvy, zmeny vo vytažení.</li>
        </ul>

        <p><strong>Spotreba paliva:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Priemerná spotreba L/100km per vozidlo.</li>
          <li>Porovnanie s katalógovou spotrebou — vozidlá s nadmernou spotrebou.</li>
          <li>Celkové náklady na palivo za obdobie.</li>
          <li>Trend spotreby — zhoršuje sa spotreba v čase?</li>
        </ul>

        <p><strong>Expirácie a kontroly:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Prehľad všetkých kontrol a poistení so stavom platnosti.</li>
          <li>Filter: platné, blížiaca sa expirácia, expirované.</li>
          <li>Kalendárny pohľad — čo treba riešiť tento mesiac, budúci mesiac.</li>
        </ul>

        <p>
          <strong>Tip:</strong> Pravidelne (aspoň mesačne) kontrolujte report nákladov per vozidlo.
          Ak je vozidlo systematicky drahšie na údržbu, zvážte jeho vyradenie a nahradenie novým.
          Report vám tiež pomáha pri vyjednávaní so servisnými partnermi a poisťovňami.
        </p>
      </>
    ),
  },
]

export default function FleetManualPage() {
  return <ManualPage title="Návod pre fleet managera" sections={sections} />
}
