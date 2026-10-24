# Foothold

Foothold er en React Native/Expo-prototype, der hjælper unge uden tidligere erhvervserfaring med at finde deres første job, med særligt fokus på gymnasieelever og unge i udsatte positioner.

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

Scan QR-koden med Expo Go på telefonen. Telefon og computer skal være på samme Wi-Fi. Projektet bruger SDK 57.

## Funktioner

- Brugerlogin og virksomhedslogin uden krav om at udfylde felterne.
- Joboversigt, jobbeskrivelse og en demoansøgning.
- Virksomhedsside for MC El & Teknik med fiktive opslag og unge.
- Opret jobopslag med titel, beskrivelse, lokation samt valgfri aldersgruppe og tags.
- Nye opslag gemmes lokalt med AsyncStorage og vises i begge oversigter efter genstart.

Filtre og medarbejderoverblik er kun visuelle.

## Filer

- `App.js`: Navigation og lokal lagring.
- `screens/`: Appens skærme.
- `components/`: Genbrugelige jobkort og tags.
- `data/`: Demonstrationsjobs og valgbare tags.
- `styles.js`: Styling og farver.

## Demovideo

Version 2: (https://youtube.com/shorts/3ryZdGE7zYU)

Version 1: https://www.youtube.com/watch?v=Tz-rWQ_6BpA

