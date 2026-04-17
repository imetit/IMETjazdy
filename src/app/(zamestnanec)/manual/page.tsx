import ManualPage, { ManualSection } from '@/components/ManualPage'

const sections: ManualSection[] = [
  {
    id: 'kniha-jazd',
    title: 'Kniha jázd',
    content: (
      <>
        <p>
          <strong>Kniha jázd</strong> je elektronická evidencia vašich služobných jázd. Slúži na výpočet
          cestovných náhrad podľa zákona o cestovných náhradách. Každá jazda, ktorú vykonáte služobným
          alebo súkromným vozidlom na pracovné účely, musí byť zaznamenaná v knihe jázd.
        </p>

        <p><strong>Ako zadať novú jazdu:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Krok 1:</strong> V menu kliknite na <strong>&quot;Nová jazda&quot;</strong>. Otvorí sa formulár na zadanie jazdy.</li>
          <li><strong>Krok 2:</strong> Vyberte <strong>mesiac</strong>, ku ktorému jazda patrí. Štandardne je predvyplnený aktuálny mesiac.</li>
          <li><strong>Krok 3:</strong> Zadajte <strong>trasu</strong> — odkiaľ ste vychádzali, cez aké mestá ste prechádzali a kam ste dorazili. Napríklad: Bratislava → Trnava → Nitra.</li>
          <li><strong>Krok 4:</strong> Zadajte <strong>počet najazdených kilometrov</strong>. Ak máte firemné vozidlo, overte stav tachometra.</li>
          <li><strong>Krok 5:</strong> Ak máte <strong>bločky</strong> (parkovné, mýto, diaľničná známka), nahrajte ich ako prílohy. Toto je nepovinné.</li>
          <li><strong>Krok 6:</strong> Kliknite <strong>&quot;Odoslať&quot;</strong> pre odoslanie jazdy na spracovanie, alebo <strong>&quot;Uložiť rozpracovanú&quot;</strong>, ak chcete jazdu dokončiť neskôr.</li>
        </ul>

        <p><strong>Stavy jazdy:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Rozpracovaná</strong> — jazda je uložená, ale ešte nebola odoslaná. Môžete ju kedykoľvek upraviť alebo zmazať.</li>
          <li><strong>Odoslaná</strong> — jazda bola odoslaná a čaká na spracovanie účtovníčkou. Už ju nemôžete upraviť.</li>
          <li><strong>Spracovaná</strong> — účtovníčka jazdu spracovala, náhrady boli vypočítané. V detaile jazdy uvidíte pridelenú sumu.</li>
        </ul>

        <p>
          <strong>Kde vidím svoje jazdy:</strong> V bočnom menu kliknite na <strong>&quot;Moje jazdy&quot;</strong>.
          Zobrazí sa zoznam všetkých vašich jázd zoradených podľa dátumu. Môžete ich filtrovať podľa mesiaca a stavu.
        </p>

        <p>
          <strong>Náhrady:</strong> Po spracovaní jazdy účtovníčkou sa v detaile jazdy zobrazí vypočítaná suma
          cestovných náhrad. Výška náhrady závisí od typu vozidla (firemné/súkromné), typu jazdy
          (tuzemská/zahraničná) a aktuálnych sadzieb za kilometer.
        </p>
      </>
    ),
  },
  {
    id: 'moje-vozidlo',
    title: 'Moje vozidlo',
    content: (
      <>
        <p>
          Ak vám bolo pridelené <strong>firemné vozidlo</strong>, nájdete jeho údaje v menu pod položkou
          <strong> &quot;Moje vozidlo&quot;</strong>. Tu vidíte základné informácie o vozidle — značku, model,
          ŠPZ, rok výroby, typ paliva a aktuálny stav tachometra.
        </p>

        <p>
          <strong>Základné údaje vozidla</strong> zahŕňajú technické parametre, dátum pridelenia, stav
          vozidla (aktívne, v servise) a históriu najazdených kilometrov po mesiacoch. Tieto údaje
          sa automaticky aktualizujú na základe vašich zaznamenaných jázd.
        </p>

        <p><strong>Nahlásiť problém s vozidlom:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Na stránke &quot;Moje vozidlo&quot; kliknite na tlačidlo <strong>&quot;Nahlásiť problém&quot;</strong>.</li>
          <li>Popíšte závadu čo najpresnejšie — čo sa deje, kedy sa to začalo, za akých okolností.</li>
          <li>Po odoslaní bude <strong>fleet manager</strong> automaticky notifikovaný a skontaktuje sa s vami ohľadom riešenia.</li>
          <li>Stav hlásenia môžete sledovať priamo na stránke vozidla.</li>
        </ul>

        <p><strong>Poistná udalosť:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>V prípade nehody alebo poškodenia vozidla kliknite na <strong>&quot;Poistná udalosť&quot;</strong>.</li>
          <li>Vyplňte formulár — <strong>dátum a čas</strong> udalosti, <strong>miesto</strong> (adresa alebo GPS), <strong>popis</strong> situácie.</li>
          <li>Ak boli prítomní <strong>svedkovia</strong>, uveďte ich mená a kontakty.</li>
          <li>Ak máte <strong>fotografie</strong> poškodenia, nahrajte ich ako prílohy.</li>
          <li>Fleet manager a vedenie budú automaticky informovaní.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'zamestnanecka-karta',
    title: 'Zamestnanecká karta',
    content: (
      <>
        <p>
          <strong>Zamestnanecká karta</strong> je váš osobný profil v systéme. Nájdete ju v menu pod
          položkou <strong>&quot;Moja karta&quot;</strong>. Obsahuje vaše osobné údaje, pracovné zaradenie
          a ďalšie dôležité informácie.
        </p>

        <p><strong>Osobné údaje a pracovné zaradenie:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Meno, priezvisko, e-mail, telefón</li>
          <li>Firma, oddelenie, pracovná pozícia</li>
          <li>Priamy nadriadený a zastupujúci</li>
          <li>Dátum nástupu, typ úväzku, fond pracovných hodín</li>
        </ul>

        <p>
          <strong>Majetok:</strong> V sekcii &quot;Majetok&quot; vidíte zoznam všetkého IT vybavenia, ktoré vám bolo
          pridelené — notebook, mobilný telefón, monitor, klávesnica, myš, headset a pod. Pri každom
          zariadení je uvedený model, sériové číslo a dátum pridelenia.
        </p>

        <p>
          <strong>Licencie:</strong> Sekcia &quot;Licencie&quot; zobrazuje softvérové licencie priradené k vášmu kontu —
          napríklad Microsoft 365, VPN prístup, špecializovaný softvér. Vidíte typ licencie, platnosť
          a prípadné poznámky.
        </p>

        <p>
          <strong>Školenia:</strong> V sekcii &quot;Školenia&quot; nájdete prehľad všetkých absolvovaných školení —
          BOZP, požiarna ochrana, odborné školenia. Pri každom školení vidíte dátum absolvovania
          a dátum platnosti. Ak sa blíži expirácia, systém vás upozorní.
        </p>

        <p><strong>Outlook kalendár — iCal link:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Na zamestnaneckej karte nájdete tlačidlo na skopírovanie <strong>iCal linku</strong>.</li>
          <li>Skopírujte si tento link.</li>
          <li>V Outlooku otvorte <strong>Súbor → Nastavenia konta → Internetové kalendáre</strong>.</li>
          <li>Kliknite &quot;Nový&quot; a prilepte skopírovaný iCal link.</li>
          <li>Kalendár sa automaticky synchronizuje s vašimi dovolenkami a služobnými cestami.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'sluzobne-cesty',
    title: 'Služobné cesty',
    content: (
      <>
        <p>
          Modul <strong>Služobné cesty</strong> slúži na evidenciu a schvaľovanie pracovných ciest.
          Každá služobná cesta musí byť vopred schválená nadriadenným.
        </p>

        <p><strong>Ako podať žiadosť o služobnú cestu:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>V menu kliknite na <strong>&quot;Služobná cesta&quot;</strong> → <strong>&quot;Nová žiadosť&quot;</strong>.</li>
          <li>Vyplňte <strong>dátumy</strong> — od kedy do kedy cesta trvá.</li>
          <li>Zadajte <strong>trasu</strong> — odkiaľ kam cestujete.</li>
          <li>Vyberte <strong>typ cesty</strong> — domáca (v rámci SR) alebo zahraničná.</li>
          <li>Zvoľte <strong>dopravný prostriedok</strong> — firemné auto, súkromné auto, vlak, autobus, lietadlo.</li>
          <li>Uveďte <strong>účel cesty</strong> — stretnutie, školenie, montáž, obchodné rokovanie.</li>
          <li>Odošlite žiadosť kliknutím na <strong>&quot;Odoslať na schválenie&quot;</strong>.</li>
        </ul>

        <p>
          <strong>Schvaľovanie:</strong> Žiadosť o služobnú cestu sa automaticky odošle vášmu
          <strong> priamemu nadriadenému</strong>. Ak je váš nadriadený na dovolenke alebo inak nedostupný,
          žiadosť sa presmeruje na <strong>zastupujúceho</strong>, ktorý je nastavený v systéme.
          O schválení alebo zamietnutí budete informovaní notifikáciou.
        </p>

        <p>
          <strong>Preddavok:</strong> Pri zadávaní žiadosti môžete požiadať o <strong>preddavok</strong> na
          cestu. Uveďte požadovanú sumu a účel (hotel, cestovné, stravné). Preddavok musí byť
          schválený spolu so žiadosťou o cestu.
        </p>

        <p><strong>Po návrate zo služobnej cesty:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Otvorte svoju služobnú cestu v zozname.</li>
          <li>Nahrajte všetky <strong>doklady</strong> — hotelový účet, cestovné lístky, účtenky za stravné, parkovné.</li>
          <li>Každý doklad označte typom (ubytovanie, cestovné, stravné, ostatné).</li>
          <li>Po nahratí všetkých dokladov kliknite <strong>&quot;Odoslať na vyúčtovanie&quot;</strong>.</li>
        </ul>

        <p>
          <strong>Vyúčtovanie:</strong> Admin (účtovníčka) skontroluje vaše doklady a vypočíta finálnu sumu.
          Výpočet zahŕňa: <strong>diéty</strong> (podľa zákona, závisí od krajiny a dĺžky cesty) +
          <strong> schválené doklady</strong> - <strong>preddavok</strong> = výsledná suma na vyplatenie alebo vrátenie.
        </p>
      </>
    ),
  },
  {
    id: 'dochadzka-dovolenky',
    title: 'Dochádzka a dovolenky',
    content: (
      <>
        <p>
          <strong>Dochádzka</strong> sa zaznamenáva pri príchode a odchode z práce. Záznam vytvoríte
          priložením čipovej karty k <strong>tabletu</strong> alebo zadaním <strong>PIN kódu</strong>.
          Systém automaticky eviduje čas príchodu, odchodu a odpracované hodiny.
        </p>

        <p>
          <strong>Moja dochádzka:</strong> V menu kliknite na <strong>&quot;Moja dochádzka&quot;</strong>.
          Zobrazí sa prehľad vašej dochádzky za vybraný mesiac — dátum, príchod, odchod,
          odpracované hodiny, nadčas. Ak máte nezrovnalosti (chýbajúci záznam, nesprávny čas),
          kontaktujte svojho nadriadeného alebo HR.
        </p>

        <p><strong>Dovolenka — ako požiadať:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>V menu kliknite na <strong>&quot;Moja dovolenka&quot;</strong>.</li>
          <li>Kliknite na <strong>&quot;Nová žiadosť&quot;</strong>.</li>
          <li>Vyberte <strong>typ voľna</strong>:
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li><strong>Dovolenka</strong> — riadna dovolenka</li>
              <li><strong>PN</strong> — práceneschopnosť (choroba)</li>
              <li><strong>OČR</strong> — ošetrovanie člena rodiny</li>
              <li><strong>Náhradné voľno</strong> — čerpanie za nadčas</li>
              <li><strong>Neplatené voľno</strong> — voľno bez nároku na mzdu</li>
            </ul>
          </li>
          <li>Zadajte <strong>dátumy</strong> od–do. Ak potrebujete len <strong>pol dňa</strong>, zaškrtnite príslušnú možnosť.</li>
          <li>Odošlite žiadosť. Váš nadriadený dostane notifikáciu.</li>
        </ul>

        <p>
          <strong>Nárok na dovolenku:</strong> Systém automaticky počíta váš nárok. Základný nárok je
          <strong> 20 dní</strong> ročne. Ak ste dosiahli vek <strong>33 rokov</strong>, nárok sa zvyšuje na
          <strong> 25 dní</strong> ročne. Zostávajúce dni vidíte v sekcii &quot;Moja dovolenka&quot;.
        </p>

        <p>
          Schvaľovanie dovolenky prebieha rovnako ako pri služobných cestách — žiadosť ide priamemu
          nadriadenému. Ak je nadriadený na dovolenke, schvaľuje zastupujúci.
        </p>
      </>
    ),
  },
  {
    id: 'notifikacie',
    title: 'Notifikácie',
    content: (
      <>
        <p>
          Systém vás informuje o dôležitých udalostiach prostredníctvom <strong>notifikácií</strong>.
          Ikona zvončeka v bočnom menu zobrazuje <strong>počet neprečítaných</strong> notifikácií.
        </p>

        <p><strong>Typy notifikácií, ktoré môžete dostať:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Dovolenka schválená / zamietnutá</strong> — informácia o rozhodnutí nadriadeného k vašej žiadosti o dovolenku.</li>
          <li><strong>Jazda spracovaná</strong> — účtovníčka spracovala vašu jazdu a náhrady boli vypočítané.</li>
          <li><strong>Jazda vrátená</strong> — jazda bola vrátená na doplnenie s komentárom.</li>
          <li><strong>Služobná cesta schválená / zamietnutá</strong> — rozhodnutie o vašej žiadosti o služobnú cestu.</li>
          <li><strong>Blížiaca sa expirácia školenia</strong> — upozornenie na končiacu platnosť školenia.</li>
        </ul>

        <p>
          <strong>Ako pracovať s notifikáciami:</strong> Kliknite na ikonu zvončeka v bočnom menu.
          Zobrazí sa zoznam všetkých notifikácií. Kliknutím na konkrétnu notifikáciu budete
          <strong> presmerovaný na detail</strong> — napríklad na detail jazdy, dovolenky alebo služobnej cesty.
          Notifikácia sa tým automaticky označí ako prečítaná.
        </p>

        <p>
          Staršie notifikácie môžete prehliadať posúvaním v zozname. Všetky notifikácie zostávajú
          v histórii, aby ste sa k nim mohli kedykoľvek vrátiť.
        </p>
      </>
    ),
  },
  {
    id: 'faq',
    title: 'Časté otázky (FAQ)',
    content: (
      <>
        <p><strong>&quot;Zabudol som heslo&quot;</strong></p>
        <p>
          Kontaktujte IT oddelenie na e-mailovej adrese <strong>it@imet.sk</strong>. IT vám resetuje
          heslo a pošle nové prihlasovacie údaje. Z bezpečnostných dôvodov si po prihlásení
          ihneď zmeňte heslo.
        </p>

        <p><strong>&quot;Nevidím niektorý modul&quot;</strong></p>
        <p>
          Prístup k jednotlivým modulom systému prideľuje <strong>administrátor</strong>. Ak nevidíte
          modul, ktorý potrebujete (napr. Služobné cesty, Archív dokumentov), kontaktujte svojho
          nadriadeného, ktorý požiada admina o pridelenie prístupu.
        </p>

        <p><strong>&quot;Ako zmením osobné údaje?&quot;</strong></p>
        <p>
          Osobné údaje v systéme (meno, adresa, telefón, bankový účet) môže zmeniť len
          <strong> HR oddelenie</strong> alebo <strong>admin</strong>. Pošlite požiadavku na zmenu
          vášmu nadriadenému alebo priamo na HR.
        </p>

        <p><strong>&quot;Koho kontaktovať pri probléme?&quot;</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>IT problémy</strong> (prihlásenie, systém nefunguje, chyby): <strong>it@imet.sk</strong></li>
          <li><strong>Vozidlá</strong> (závady, servis, poistné udalosti): <strong>fleet manager</strong></li>
          <li><strong>HR záležitosti</strong> (osobné údaje, dovolenky, pracovné zmluvy): <strong>admin / HR</strong></li>
          <li><strong>Účtovníctvo</strong> (jazdy, náhrady, vyúčtovanie ciest): <strong>účtovníčka</strong></li>
        </ul>
      </>
    ),
  },
]

export default function ZamestnanecManualPage() {
  return <ManualPage title="Návod pre zamestnanca" sections={sections} />
}
