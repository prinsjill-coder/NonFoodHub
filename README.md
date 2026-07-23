# Bidfood Non-Food Hub

Fase 1 van de statische Bidfood Non-Food Hub website. De website is gebouwd als zelfstandige HTML/CSS/JavaScript-site op basis van de bestaande Notion-pagina:

https://sturdy-dimple-0eb.notion.site/Welkom-in-de-Bidfood-Non-Food-Inspiratieomgeving-304618b55617803aaa04f46e5ba00b92

De Notion-pagina is gebruikt als bron voor content, structuur, afbeeldingen en links. De site is geen Notion-kopie, maar een professionele websitehub voor horecaondernemers, chefs, eigenaren, F&B managers, accountmanagers en verkoopteams.

De huisstijl is aangescherpt naar een Bidfood-geïnspireerd kleurenpalet met professioneel blauw als primaire accentkleur voor knoppen, links, navigatie, iconen en hover-effecten.

## Projectstructuur

```text
NonFoodHub/
├── index.html
├── README.md
├── assets/
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   └── main.js
│   └── images/
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

## Techniek

- HTML5
- CSS
- JavaScript
- Geen framework
- Geen buildstap
- Geschikt voor GitHub Pages

## Installatie

Er is niets te installeren. Alle bestanden staan lokaal in dit project en kunnen direct in de browser worden geopend.

## Lokaal openen

Open `index.html` rechtstreeks in je browser.

Aanbevolen voor lokale controle: open een terminal in de projectmap `NonFoodHub` en start een simpele previewserver met:

```bash
python3 -m http.server 8080
```

Daarna open je:

```text
http://localhost:8080
```

## Publiceren via GitHub Pages

1. Maak via GitHub Desktop een repository van deze map of plaats deze map in een bestaande repository.
2. Push de bestanden naar GitHub.
3. Ga in GitHub naar `Settings` > `Pages`.
4. Kies als source de juiste branch, meestal `main`.
5. Kies de rootmap `/`.
6. Sla op en wacht tot GitHub Pages de site heeft gepubliceerd.

## Nog handmatig toe te voegen

Deze onderdelen konden niet volledig automatisch uit de Notion-pagina worden overgenomen:

- Directe PDF-downloadlinks van brochures. De bron gaf wel leverancier, categorie en PDF-bestandsnaam terug, maar niet betrouwbaar de directe PDF-URL.
- De echte virtuele showroomtour-embed of tourlink. De tekst en contactroute zijn wel overgenomen.
- Het droogijs-bestelformulier. De inhoud is overgenomen; de formulier-embed kwam niet mee in de automatische extractie.
- Eventuele verborgen databasevelden uit Notion, zoals statusvelden, sortering, filters of interne eigenschappen die niet in de openbare tekstextractie verschenen.
- Definitieve merkassets zoals een officieel Bidfood-logo in vectorformaat, als die later beschikbaar zijn.

## Fase 2 ideeën

Niet geïmplementeerd in Fase 1, maar logisch voor een volgende fase:

- Brochurebibliotheek koppelen aan echte PDF-downloads.
- Zoekfunctie uitbreiden naar volledige contentsearch.
- Leveranciersdetailpagina's per partner.
- Virtuele showroom embedden zodra de tourlink beschikbaar is.
- Leadformulier voor samples, showroombezoek en droogijs.
- CMS-achtige datafile of JSON-structuur om content later makkelijker te beheren.
- Conversietracking en analytics.
- Officiële Bidfood huisstijl-assets toevoegen.
