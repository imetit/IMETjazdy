# Inštalácia dochádzkového tabletu (Android)

Postup prvotnej inštalácie Android tabletu ako dochádzkového terminálu.

## 1. Prihlásenie v prehliadači

1. Otvor **Chrome** na tablete.
2. Choď na `https://imetjazdy-work.vercel.app/login`.
3. Prihlás sa:
   - Email: `tablet@imet.sk`
   - Heslo: `TabletDochadzka2026!` (zmeň si v adminovi cez reset hesla)
4. Automaticky ťa presmeruje na `/dochadzka?smer=prichod`.

> **Kiosk režim**: účet `tablet` nemôže ísť nikam inam — každá iná URL ho vráti na `/dochadzka`.

## 2. Pridať na domovskú obrazovku (PWA)

1. V Chrome klikni na **menu (⋮) → „Add to Home screen" / „Pridať na plochu"**.
2. Potvrď názov „Dochádzka".
3. Spusti ikonu z plochy — aplikácia beží **fullscreen bez URL lišty**, na šírku.

Manifest má `display: fullscreen` a `orientation: landscape`, takže sa otvorí na šírku a bez systémových líšt (kým to OS povolí).

## 3. App Pinning — zamknutie na dochádzke

Aby zamestnanec nevedel z aplikácie vyjsť:

1. **Nastavenia → Zabezpečenie → Pripnutie aplikácie / App Pinning** (na niektorých Androidoch: Settings → Security → Advanced → Pin windows).
2. Zapni **„Pin windows"** (alebo „Screen Pinning") a zapni aj **„Ask for PIN before unpinning"**.
3. Spusti „Dochádzka" z plochy.
4. Otvor prehľad nedávnych aplikácií (tlačidlo ⬜) → ťukni na ikonu aplikácie hore nad kartou → **Pripnúť**.
5. Teraz je aplikácia pripnutá — odopnutie vyžaduje PIN tabletu (stlačiť **späť + prehľad súčasne** a zadať PIN).

## 4. Odporúčané nastavenia tabletu

- **Obrazovka vždy zapnutá počas nabíjania**: Nastavenia → Pre vývojárov → „Zostať bdelý" (ak používaš dock/kabel).
- **Auto-rotácia vypnutá** (landscape fixed).
- **Jasnosť automatická** — alebo 60–80%.
- **Nerušiť / Focus mode** — zabrániť notifikáciám.
- **Google Assistant vypnutý** (dlhý stlač tlačidla Home).
- **Rodičovská kontrola** (voliteľne) — Google Family Link môže obmedziť Play Store.

## 5. Čítačka RFID kariet

RFID čítačka musí byť vo „HID keyboard" režime — po priložení karty pošle kód + Enter. Dochádzková obrazovka má neviditeľný input, ktorý tieto vstupy zachytáva.

Ak čítačka podporuje aj „virtual COM port" (sériový mode), **prepni ju na HID** — inak tablet vstup nespracuje.

## 6. PIN prihlásenie

Každý zamestnanec má v profile `pin` (4–6 číslic). Nastavuje sa v `/admin/zamestnanci`. Zamestnanec ťukne na „Zadať PIN" a zadá číslice na obrazovke.

## 7. Riešenie problémov

- **Tablet sa odhlásil** — sessiónový token Supabase vyprší po 1 hodine, ale refresh token beží. Ak appka napriek tomu pýta login, znova sa prihlás `tablet@imet.sk`.
- **Obrazovka zbledne / ide do sleep** — v Androide Nastavenia → Displej → „Uspať obrazovku" → „Nikdy" (alebo najdlhšie dostupné), + „Zostať bdelý" v Developer options.
- **PWA neaktualizuje novú verziu** — v Chrome: Nastavenia → Stránky a dáta → vymazať cache pre doménu; alebo odinštalovať PWA a pridať znova.
- **Ikona v app pinningu nejde pripnúť** — niektoré Androidy majú pinning len cez gestá (swipe up hold). Pozri výrobcovu dokumentáciu.

## 8. Výmena tabletu

Pri výmene stačí na novom tablete zopakovať kroky 1–3. DB účet je jeden spoločný (`tablet@imet.sk`), takže história dochádzky zostáva.
