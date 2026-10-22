# Foothold

Foothold er en React Native/Expo-prototype, der hjælper unge på 18–25 år med at finde deres første job.

## Start

Installer Node.js LTS, og åbn terminalen i projektmappen.

I PowerShell skriver du:

```powershell
.\start.cmd
```

Husk `.\` foran filnavnet. Scriptet installerer pakkerne, hvis Expo eller AsyncStorage mangler, og starter Expo.

Du kan også starte manuelt:

```powershell
npm.cmd install
npm.cmd start
```

Scan QR-koden med Expo Go på telefonen. Telefon og computer skal være på samme Wi-Fi. Projektet bruger SDK 57 og kræver en kompatibel [Expo Go-version](https://expo.dev/go?sdkVersion=57&platform=android&device=true). På iPhone kræves en SDK-opgradering, hvis Expo Go ikke understøtter SDK 57.

Tryk `w` i Expo-terminalen for at åbne browseren. Stop med `Ctrl+C`.

## Funktioner

- Brugerlogin og virksomhedslogin uden krav om at udfylde felterne.
- Joboversigt, jobbeskrivelse og en demoansøgning.
- Virksomhedsside for MC El & Teknik med fiktive opslag og unge.
- Opret jobopslag med titel, beskrivelse, lokation samt valgfri aldersgruppe og tags.
- Nye opslag gemmes lokalt med AsyncStorage og vises i begge oversigter efter genstart.

Ansøgninger sendes ikke. Filtre og medarbejderoverblik er kun visuelle.

## Filer

- `App.js`: Navigation og lokal lagring.
- `screens/`: Appens skærme.
- `components/`: Genbrugelige jobkort og tags.
- `data/`: Demonstrationsjobs og valgbare tags.
- `styles.js`: Styling og farver.

## Test på telefonen

Opret et jobopslag. Luk Expo Go helt, og åbn projektet igen på samme telefon. Kontrollér, at opslaget, aldersgruppen og tags stadig findes. Appen er ikke testet på en fysisk telefon her.

## Demovideo

Version 2: [Indsæt link her]

Version 1: https://www.youtube.com/watch?v=Tz-rWQ_6BpA

## Forfatter

[Indsæt navn. Hvis projektet er fælles, skriv kort, hvem der har lavet hvad.]
