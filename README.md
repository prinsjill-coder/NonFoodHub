# Bidfood Non-Food Hub

Een zelfstandige statische website voor de Bidfood Non-Food inspiratieomgeving. De site bundelt leveranciers, brochures, virtuele showroominformatie, horeca-inspiratie, acties en aanvullende non-food onderdelen op één professionele plek.

## Status

Fase 1 is gepubliceerd via GitHub Pages.

De website is gebaseerd op de openbare Notion-omgeving en is omgezet naar een onderhoudsvriendelijke statische HTML/CSS/JavaScript-site. De huisstijl is aangescherpt naar een Bidfood-geïnspireerd blauw kleurenpalet voor knoppen, links, navigatie, iconen en hover-effecten.

## Techniek

- HTML5
- CSS
- JavaScript
- Geen framework
- Geen buildstap
- Geschikt voor GitHub Pages

## Projectstructuur

```text
NonFoodHub/
├── index.html
├── AI_INSTRUCTIONS.md
├── README.md
├── CHANGELOG.md
├── WORKFLOW.md
├── .gitignore
├── .gitattributes
├── docs/
│   ├── MASTERPLAN.md
│   ├── decisions/
│   ├── diagrams/
│   └── wireframes/
├── assets/
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   └── main.js
│   └── images/
│       ├── favicon.svg
│       └── lokale Notion-afbeeldingen en brochurethumbnails
└── pages/
    ├── aanbiedingen.html
    ├── bibliotheek.html
    ├── brochures-catalogi.html
    ├── contact.html
    ├── droogijs.html
    ├── inspiratie.html
    ├── leveranciers.html
    ├── logos-personalisatie.html
    ├── nieuw.html
    ├── terras-outdoor.html
    └── virtuele-showroom.html
```

## Lokaal bekijken

Open een terminal in de projectmap `NonFoodHub` en start:

```bash
python3 -m http.server 8080
```

Open daarna:

```text
http://localhost:8080
```

Je kunt `index.html` ook rechtstreeks openen, maar de previewserver is aanbevolen omdat dit beter overeenkomt met GitHub Pages.

## Ontwikkelworkflow

1. Werk lokaal binnen de projectmap.
2. Test wijzigingen lokaal via `python3 -m http.server 8080`.
3. Controleer de aangepaste bestanden in GitHub Desktop.
4. Maak een duidelijke commit in GitHub Desktop.
5. Push daarna naar `main`.
6. Controleer de live website kort nadat GitHub Pages opnieuw gepubliceerd heeft.

Zie ook [WORKFLOW.md](WORKFLOW.md).

## Projectdocumentatie

De volledige projectblauwdruk staat in [docs/MASTERPLAN.md](docs/MASTERPLAN.md).

Gebruik dit document als leidende bron voor toekomstige ontwikkeling, waaronder Fase 1A, NonFood Hub Studio, contentbeheer, navigatie, PDF-beheer en Codex-opdrachten.

AI-assistenten gebruiken [AI_INSTRUCTIONS.md](AI_INSTRUCTIONS.md) als operationele startinstructie en lezen daarna de volledige `docs/`-map.

## Publicatie via GitHub Pages

GitHub Pages publiceert vanaf:

- Branch: `main`
- Map: `/ (root)`

Er is geen buildstap nodig. `index.html` staat in de hoofdmap van het project.

## Changelog

Belangrijke wijzigingen worden bijgehouden in [CHANGELOG.md](CHANGELOG.md).

## Nog handmatig toe te voegen

Deze onderdelen konden niet volledig automatisch uit de Notion-pagina worden overgenomen:

- Directe PDF-downloadlinks van brochures. De bron gaf wel leverancier, categorie en PDF-bestandsnaam terug, maar niet betrouwbaar de directe PDF-URL.
- De echte virtuele showroomtour-embed of tourlink. De tekst en contactroute zijn wel overgenomen.
- Het droogijs-bestelformulier. De inhoud is overgenomen; de formulier-embed kwam niet mee in de automatische extractie.
- Eventuele verborgen databasevelden uit Notion, zoals statusvelden, sortering, filters of interne eigenschappen die niet in de openbare tekstextractie verschenen.
- Definitieve merkassets zoals een officieel Bidfood-logo in vectorformaat, als die later beschikbaar zijn.

## Roadmap

### Fase 2A

- Brochurebibliotheek uitbreiden met echte PDF-downloadlinks.
- Contentstructuur verder professionaliseren voor makkelijker onderhoud.
- Leveranciersinformatie verder verrijken waar bronmateriaal beschikbaar is.
- Formulieren of aanvraagroutes voorbereiden voor showroombezoek, samples en droogijs.

### Latere fases

- Zoekfunctie uitbreiden naar volledige contentsearch.
- Leveranciersdetailpagina's per partner.
- Virtuele showroom embedden zodra de tourlink beschikbaar is.
- CMS-achtige datafile of JSON-structuur om content later makkelijker te beheren.
- Conversietracking en analytics toevoegen wanneer gewenst.
- Officiële Bidfood huisstijl-assets toevoegen wanneer beschikbaar.

## Rechten

Dit project bevat Bidfood-gerelateerde inhoud, merkuitingen en assets en is niet bedoeld voor vrij hergebruik of verspreiding zonder toestemming.

Er is bewust geen open-sourcelicentie zoals MIT, Apache of GPL toegevoegd.
