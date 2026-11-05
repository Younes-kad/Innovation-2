# Foothold

Foothold er en React Native/Expo-app, der hjælper unge uden tidligere erhvervserfaring med at finde deres første job. Appen har nu en Node-backend og permanent SQLite-database; det eksisterende grønne design og joboversigten er bevaret.

## Start

Installer Node.js 22.13 eller nyere (med `node:sqlite`), og åbn terminalen i projektmappen.

I PowerShell skriver du:

```powershell
.\start.cmd
```

Husk `.\` foran filnavnet. Scriptet installerer manglende pakker og starter både API på port 3001 og Expo. Ctrl+C stopper begge processer.

Du kan også starte manuelt:

```powershell
npm.cmd install
npm.cmd start
```

Web: `npm.cmd run web`. Opret først en virksomhedskonto og et job, log ud, opret en ungekonto, og søg jobbet. Kontooprettelse kræver navn, e-mail, telefonnummer og mindst 10 tegn i adgangskoden. Unge angiver også fødselsdato (ÅÅÅÅ-MM-DD); er man under 18, er en forælders telefonnummer obligatorisk. Der følger ingen konti eller adgangskoder med.

Telefonnumre accepteres som 8 cifre eller med international landekode (fx +45). Kravene kontrolleres både i formularen og på serveren. Telefonnumre og fødselsdato gemmes separat som private kontooplysninger og deles ikke via profiler eller ansøgninger. Numrene registreres uden SMS-verifikation. Eksisterende konti kan stadig logge ind; de nye felter kræves ved ny konto-oprettelse.

I Expo Go finder appen automatisk backend på samme computeradresse som Expo-serveren, på port 3001. Telefon og computer skal være på samme lokale netværk. Ved en anden backendadresse eller Expo-tunnel kan du angive API-adressen inden opstart, fx:

```powershell
$env:EXPO_PUBLIC_API_URL = 'http://192.168.1.20:3001'
npm.cmd start
```

Ved “Ingen forbindelse til serveren” viser fejlbeskeden nu den anvendte API-adresse. Start med `.\start.cmd --clear`, som starter både backend og Expo. Åbn `http://<computerens-IP>:3001/health` i telefonens browser; svaret skal være `{"ok":true}`. Kan telefonen ikke åbne adressen, skal netværksadgang eller firewall til port 3001 kontrolleres. Expo-tunnelen videresender ikke automatisk backend-porten; brug en API-adresse, telefonen kan nå, via `EXPO_PUBLIC_API_URL`.

Scan QR-koden med Expo Go til SDK 58. Telefon og computer skal være på samme Wi-Fi; port 3001 skal kunne nås fra telefonen. Projektet bruger Expo SDK 58 med React Native 0.88 og React 19.3. Billedvælgeren understøtter JPG, PNG og WebP op til 5 MB. Sessionsnøglen ligger kun i hukommelsen: efter genindlæsning logger man ind igen.

Efter opgradering fra SDK 57: stop den gamle server med Ctrl+C, kør `npm.cmd install`, og start igen med `.\start.cmd --clear`. Det rydder Metro-cachen. Opgradér også Expo Go på telefonen til en version, der understøtter SDK 58. Fremgangsmåden følger [Expos opgraderingsvejledning](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/).

## Funktioner

- Fast bundnavigation med tre faner: Hjem, Job og Profil for unge; Feed, Job og Profil for virksomheder. Fanerne bevarer navigationen, så bundmenuen bliver stående i jobdetaljer, ansøgninger og profilvisninger.
- To fiktive inspirationsopslag og to fiktive, søgbare jobs oprettes én gang i databasen: Cafémedhjælper og Junior SoMe-hjælper. Alle fire vises i feedet uden krav om at følge en profil; kun de to jobs vises i joboversigten. De er tydeligt markeret som fiktive, og demoansøgninger gemmes i appen uden at blive sendt til en rigtig arbejdsgiver. Eksisterende indhold bevares, og genstart opretter ingen dubletter.
- Inspirationsopslagene er skrevet af demoprofilerne Sofie Nielsen (første fritidsjob på café) og Malik Jensen (erfaringer fra et SoMe-projekt). Deres navn i feedet åbner en fiktiv profil med præsentation, erfaring, uddannelse og kompetencer, som kan følges. Demoindholdet blandes som job → personligt opslag → job → personligt opslag. En engangsmigrering flytter de tidligere generiske demoopslag til de to profiler uden at ændre rigtige brugeres indhold.
- Hjem/Feed viser de nyeste opslag fra profiler, man følger. Find profiler, følg/stop med at følge, og åbn deres profil direkte fra feedet. Både unge og virksomheder kan oprette opslag.
- Feedet viser hele opslagets tekst og eventuelle billeder i kort med navn, profilbillede, overskrift og dato. Egne opslag vises øverst, også når de er private; andre får kun adgang efter de eksisterende delingsvalg. Opret og rediger direkte i feedet, eller skriv fra Profil → Opslag; efter gemning åbnes/opdateres feedet automatisk. Gamle egne opslag kommer også med uden at blive genoprettet. Søgning efter profiler og notifikationsmærker blokerer ikke længere et ellers fungerende feed, hvis de fejler.
- Privat som udgangspunkt: slå “Min profil må findes og følges af andre” til under Rediger profil for at vise navn, billede og overskrift i profilsøgningen. Hvert opslag har et særskilt valg om deling med følgere. Eksisterende private opslag offentliggøres ikke automatisk. Profilens øvrige sektioner, telefonnumre og løn er beskyttet som før.
- Røde badges viser ulæste opslag i feedet, nye jobs (unge), nye ansøgninger (virksomhed), ansættelsestilbud (unge) og svar på tilbud (virksomhed). De opdateres ved skærmskift/genåbning og hvert 20. sekund, mens appen er aktiv. Det er badges i appen, ikke pushbeskeder. Læsemarkeringer gemmes på kontoen og bevares efter genstart.
- Jobfanen har søgning i titel, virksomhed, beskrivelse og tags samt filtre for lokation og område/kompetence. Eksempelopslag er skjult som standard og kan slås til under Filtrér jobs.
- Profilfanen rummer profilredigering og opslag. Unge finder Mine ansættelser her; virksomhedsprofiler viser Hvem har vi ansat? med profillinks og adgang til ansøgninger/tilbud. Log ud ligger også under Profil.
- Separate unge- og virksomhedskonti med adgangskoder lagret som saltede scrypt-hashes og serverkontrollerede sessioner, der udløber efter 24 timer.
- Virksomheders jobopslag gemmes i databasen og vises i unges joboversigt.
- Ansøgninger med navn, billede (hvis delt), dato, stilling, indhold og status. Filtrering efter stilling og status samt direkte profillinks.
- Ansøgninger kan modtages, behandles, accepteres og afvises. Efter accept sender virksomheden et ansættelsestilbud med aftalt løn (kr./time, kr./måned eller kr. i alt), ugentlige timer, startdato og varighed: 3 måneder, 6 måneder, 1 år, miniprojekt eller engangsopgave. Slutdato beregnes ved faste varigheder; ved projekter/opgaver angives den særskilt.
- Virksomheden følger tilbud under Tilbud. Den unge finder dem under Mine ansættelser og skal selv godkende eller afvise. Først ved godkendelse registreres personen under Ansatte. Virksomheden kan ikke registrere en ny ansættelse uden denne godkendelse.
- Ved godkendelse kan den unge vælge at tilføje jobbet under Erfaring med det samme eller gøre det senere fra Mine ansættelser. Kun virksomhed, stilling og periode tilføjes. Profilens privatlivsindstillinger bevares; løn og timer deles aldrig på profilen. Tilbudsvilkår ses kun af afsendervirksomheden og den unge. Et sendt tilbud kan ikke ændres; ved afvisning kan virksomheden sende et nyt tilbud.
- Redigerbar profil med billede, overskrift, lokation, præsentation, kronologiske erfaringer (job, frivilligt arbejde, projekter), uddannelse og kompetencer.
- Oprettelse, redigering og sletning af egne opslag med billeder, dato og nyeste først.
- Privatliv pr. profilsektion og pr. opslag. Alt er privat som udgangspunkt. Kun ejeren kan redigere. Virksomhedsdelte profilsektioner og opslag kræver en ansøgnings- eller ansættelsesrelation; deling med følgere er et separat tilvalg. Navn og indsendte ansøgningsoplysninger deles med modtagervirksomheden.
- Eksisterende eksempelopslag er bevaret og markeret; de kan ikke søges, da de ikke tilhører en registreret virksomhed.

Filtrene i både joboversigten og Ansøgninger er funktionelle.

## Database og drift

API'et starter med en tom database og opretter tabeller automatisk. Data ligger i `server/storage/foothold.sqlite` og bevares mellem genstarter. Mappen er git-ignoreret; behold den ved opdatering. Tag backup, mens serveren er stoppet (eller med en SQLite-kompatibel backup, der inkluderer WAL). Ingen eksisterende lokale data slettes automatisk. Tidligere registrerede ansatte bevares og markeres som ældre registreringer uden tilbudsvilkår; alle nye ansættelser kræver godkendelse via tilbud.

Backend kan startes separat med `npm.cmd run server`. Miljøvariabler:

- `PORT`: API-port, standard `3001`.
- `DB_PATH`: alternativ databasefil.
- `ALLOWED_ORIGINS`: kommaseparerede tilladte weborigins; standard `http://localhost:8081,http://localhost:19006`.
- `EXPO_PUBLIC_API_URL`: API-adresse, der indbygges i klienten.

Dette er en lokal udviklingsopsætning. Offentlig drift kræver HTTPS, en vedvarende serverdisk og korrekt API-adresse/weborigin. E-mailbekræftelse, gendannelse af adgangskoder og virksomhedskontrol er ikke implementeret.

## Test

```powershell
npm.cmd test
npx.cmd expo export --platform web
npm.cmd run test:ui
```

Integrationstesten bruger en isoleret midlertidig database og dækker profilredigering, erfaring og uddannelse, opslag med billeder, ansøgning, virksomhedsoversigt, profilvisning med privatlivsfiltre, statusændringer og persistens efter servergenstart. Tilbudsflowet testes for løn/timer/varighed, afvisning og genfremsendelse, medarbejdergodkendelse, ingen ansættelse før godkendelse, øjeblikkelig/senere/ingen tilføjelse til profil, beskyttelse af lønoplysninger og blokering af fremmede konti og dobbelte svar. Testene dækker også registreringens telefonkrav og 18-årsgrænse, dubletter, ugyldige datoer, billedformater og tilbagekaldelse af deling.

Feedtesten kontrollerer opt-in, følg/stop, virksomhedsopslag, privatliv og ulæste badges, inklusive nye opslag der ankommer, mens en skærm bliver læst. UI-testen bruger den eksporterede webapp, en isoleret database i hukommelsen og en skjult Edge-browser. Den gennemfører navigation, feed, jobfiltrering, ansøgning, tilbudsgodkendelse og virksomhedens ansatte ved 320/390 px bredde. Edge skal være installeret; alternativt kan `BROWSER_CHANNEL` sættes til fx `chrome`. Der ændres ingen rigtige konti i testen.

Manuel kontrol: opret virksomhed og job → opret ung og profil → tilføj erfaring og et delt opslag → søg jobbet → log ind som virksomhed → åbn ansøgning og profil → accepter ansøgning → udfyld løn, timer, startdato og varighed → send tilbud → log ind som ung → Mine ansættelser → vælg profiltilføjelse → godkend → kontrollér virksomhedens Ansatte og den unges Erfaring. Prøv også afvisning og tilføjelse til profil senere. Kontrollér, at private oplysninger og løn ikke vises på virksomhedsvisningen af profilen, og prøv billedvælgeren på mobil og web.

## Filer

- `App.js`: Rollespecifik navigation, login, jobdata og import af lokale opslag.
- `screens/`: Appens skærme.
- `components/`: Genbrugelige jobkort og tags.
- `data/`: Demonstrationsjobs og valgbare tags.
- `styles.js`: Styling og farver.
- `server/index.cjs`: API, SQLite-skema, validering og adgangskontrol.
- `server/server.test.cjs`: Integrationstest af hele flowet.
- `data/api.js`: API-klient; sessionsnøglen gemmes kun i hukommelsen.

## Demovideo

Version 2: (https://youtube.com/shorts/3ryZdGE7zYU)

Version 1: https://www.youtube.com/watch?v=Tz-rWQ_6BpA

