# Ontwikkelworkflow

Dit project wordt lokaal ontwikkeld en gepubliceerd via GitHub Desktop en GitHub Pages.

## Vaste werkwijze

1. Codex werkt lokaal binnen de projectmap `NonFoodHub`.
2. Wijzigingen worden eerst lokaal getest via een previewserver.
3. GitHub Desktop toont alle aangepaste bestanden.
4. Er wordt een duidelijke commit gemaakt.
5. Daarna wordt naar `main` gepusht.
6. GitHub Pages publiceert de wijziging automatisch.
7. De live website wordt na iedere publicatie kort gecontroleerd.

## Lokale preview

Open een terminal in de projectmap en start:

```bash
npm run dev
```

Open daarna:

```text
http://localhost:3000
```

## Afspraken voor toekomstige ontwikkelingen

- Maak kleine, logische commits.
- Wijzig geen live content zonder lokale controle.
- Verwijder geen bestaande content zonder expliciete opdracht.
- Zet geen wachtwoorden, API-sleutels of persoonsgegevens in de repository.
- Houd bestandsnamen bij voorkeur klein, duidelijk en zonder spaties.
- Werk `CHANGELOG.md` bij bij belangrijke wijzigingen.
- Werk `README.md` bij wanneer de projectstructuur, lokale preview of publicatiewerkwijze verandert.
- Laat ontwerp- en functionaliteitswijzigingen vooraf lokaal controleren voordat ze naar `main` gaan.
