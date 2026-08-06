# NonFoodHub

NonFoodHub is een build-less, statische website met een aparte browsergebaseerde Studio voor contentbeheer. De publieke website gebruikt gecontroleerde projecties onder `data/public/*`; ruwe Studio-data onder `data/*.json` wordt niet rechtstreeks op de publieke website gerenderd.

## Status

De huidige releasekandidaat bevat:

- publieke website met homepage, inspiratie, leveranciers, brochures, bibliotheek, contact, droogijs en personalisatie;
- publieke contentprojecties voor artikelen, leveranciers en brochures;
- Studio-modules voor leveranciers, brochures, media, kennisbank en bibliotheek;
- read-only governance en content-readiness;
- lokale checks en Playwright-browseracceptatie.

Er is geen backend, API, database, CMS-framework, login, rollenlaag of automatische publicatieflow.

## Techniek

- HTML5
- CSS
- JavaScript
- Native ES modules voor Studio
- JSON-datafiles
- Geen framework
- Geen buildstap
- Geschikt voor GitHub Pages

## Projectstructuur

```text
NonFoodHub/
|-- index.html
|-- pages/
|-- assets/
|   |-- css/
|   |-- js/
|   `-- images/
|-- data/
|   |-- public/
|   |-- articles.json
|   |-- brochures.json
|   |-- library.json
|   |-- media.json
|   `-- suppliers.json
|-- studio/
|-- shared/
|-- components/
|-- scripts/
|-- tests/
`-- docs/
```

## Publieke contentlaag

De publieke website leest alleen gecontroleerde projecties:

- `data/public/articles.json`
- `data/public/suppliers.json`
- `data/public/brochures.json`

Deze datasets bevatten alleen bezoekersvelden. Interne Studio-velden zoals governance, readiness, statusvelden, validatiemetadata en beheeropmerkingen blijven buiten de publieke projecties.

## Studio

Studio draait lokaal/statisch in de browser via `studio/index.html`.

Studio gebruikt een in-memory werksessie:

- data wordt geladen uit JSON-bestanden;
- wijzigingen blijven in de actieve browserwerksessie;
- export is een handmatige overdrachtsstap;
- Studio schrijft niet naar de repository, browseropslag, backend of database.

## Lokaal bekijken

Start een lokale previewserver vanuit de projectmap:

```bash
npm run dev
```

Open daarna:

```text
http://localhost:3000
```

De Playwright-tests starten hun eigen lokale testserver via `npm run test:e2e`.

## Checks

Belangrijke lokale checks:

```bash
node scripts/check-public-content.mjs
node scripts/check-content-readiness.mjs
node scripts/check-content-governance.mjs
node scripts/check-studio.mjs
node scripts/check-suppliers.mjs
node scripts/check-brochures.mjs
node scripts/check-media.mjs
node scripts/check-articles.mjs
node scripts/check-article-quality.mjs
node scripts/check-library.mjs
node scripts/check-library-quality.mjs
node --check assets/js/main.js
npm run test:e2e
git diff --check
```

## Documentatie

De projectdocumentatie staat in `docs/`, met `docs/MASTERPLAN.md` als centrale ingang. De technische architectuur staat in `docs/07-software-architecture.md`.

## Publicatie

Publicatie blijft handmatig en Git-gebaseerd:

1. wijzigingen lokaal controleren;
2. checks draaien;
3. wijzigingen reviewen;
4. committen;
5. pushen naar `main`;
6. GitHub Pages publiceert de statische website.

Er is geen publicatieknop, automatische synchronisatie of workflowengine.

## Rechten

Dit project bevat organisatiegerelateerde inhoud en assets en is niet bedoeld voor vrij hergebruik of verspreiding zonder toestemming. Er is bewust geen open-sourcelicentie toegevoegd.
