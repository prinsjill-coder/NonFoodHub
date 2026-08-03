# 07 - Softwarearchitectuur

## Doel

De architectuur moet de publieke website en Studio laten groeien vanuit dezelfde centrale contentstructuur. Technische keuzes ondersteunen gebruiksgemak, beheerbaarheid en schaalbaarheid.

## Architectuurprincipes

- Single Source of Truth.
- Scheiding tussen website, Studio en contentlaag.
- Componentgericht ontwikkelen.
- Configuratie boven maatwerk.
- Hergebruik boven nieuwbouw.
- Toegankelijkheid en performance vanaf het begin.

## Logische lagen

```text
Publieke website
  leest gepubliceerde content

Studio
  beheert content, relaties en publicatie

Contentlaag
  bewaart data, status, bestanden en relaties
```

De website wijzigt nooit content. Studio beheert content. De contentlaag bevat geen presentatielogica.

## Aanbevolen toekomstige structuur

De huidige Fase 1 is statische HTML/CSS/JavaScript. Voor verdere groei moet de structuur stapsgewijs richting modulaire onderdelen:

```text
NonFoodHub/
├── docs/
├── assets/
│   ├── images/
│   └── downloads/
├── data/
│   ├── navigation.json
│   ├── suppliers.json
│   ├── brochures.json
│   ├── articles.json
│   ├── specialists.json
│   └── media.json
├── components/
├── pages/
├── studio/
└── shared/
```

Deze structuur hoeft niet in een keer volledig te worden ingevoerd. De eerste stap is het loshalen van hardcoded content naar centrale data.

## Herbruikbare componenten

Minimaal:

- SiteHeader
- SiteFooter
- Hero
- CTA
- Card
- SupplierTile
- BrochureCard
- ArticleCard
- ContactCard
- ResponsiveEmbed
- FilterBar
- SearchOverlay
- MediaImage

## Routing en URL's

Voor versie 1:

- `index.html`
- `pages/leveranciers.html`
- `pages/brochures-catalogi.html`
- `pages/virtuele-showroom.html`
- `pages/droogijs.html`
- `pages/inspiratie.html`
- `pages/bibliotheek.html`
- `pages/contact.html`

Voor latere versies kan een slugstructuur worden toegevoegd:

```text
/leveranciers/[slug]
/kennisbank/[slug]
```

## Data eerst

Voordat Studio wordt gebouwd, moeten de belangrijkste hardcoded blokken worden omgezet naar data:

- navigatie;
- footer;
- contactgegevens;
- leveranciers;
- brochures;
- kennisbankartikelen;
- bibliotheekitems;
- showroomconfiguratie;
- droogijsshopconfiguratie.

## Externe embeds

Kuula en Google Forms worden gezien als externe content.

Regels:

- waar mogelijk lazy of click-to-load;
- fallbacklink aanwezig;
- duidelijke contexttekst;
- responsive embed;
- privacytekst waar relevant.

## Performance

Belangrijk:

- afbeeldingen optimaliseren;
- grote PNG's vermijden;
- `loading="lazy"` toevoegen waar zinvol;
- width/height attributen toevoegen;
- PDF-bestandsgrootte tonen bij zware documenten.

## Beveiliging

Studio is niet publiek toegankelijk zonder authenticatie. Voor een eerste lokale fase kan Studio nog als interne tool functioneren, maar de architectuur moet rekening houden met:

- authenticatie;
- autorisatie;
- uploadvalidatie;
- audit trail;
- soft delete.

## Technische overgangsstrategie

1. Huidige statische site stabiel houden.
2. Centrale datafiles toevoegen.
3. Website uit data laten renderen waar mogelijk.
4. Eerste Studio-formulieren bouwen voor data en uploads.
5. Pas daarna overwegen of een framework of backend nodig is.

## Statische Studio-werksessie

Voor de lokale en GitHub Pages-vriendelijke fase gebruikt Studio geen backend,
geen GitHub API en geen browseropslag zoals `localStorage` of `sessionStorage`.
Studio laadt centrale JSON-data, maakt een kopie in browsergeheugen en laat
beheerders wijzigingen voorbereiden binnen die actieve werksessie.

Export is een overdrachtsstap, geen publicatie. Studio genereert een volledig
gevalideerd en genormaliseerd JSON-bestand als download. De beheerder vervangt
het betreffende bestand daarna handmatig in de repository en gebruikt GitHub
Desktop voor commit en push. Pas na push naar `main` publiceert GitHub Pages de
wijziging.

Deze architectuur houdt de contentlaag vervangbaar. Een toekomstige backend kan
de in-memory sessieadapter vervangen door een persistente adapter zonder dat de
formuliercomponenten of validatieregels opnieuw ontworpen hoeven te worden.

## Studio contentmodule-toolkit

Vanaf Sprint 5 gebruikt Studio kleine gedeelde helpers voor bewezen identiek
gedrag: contentstatussen, formulierfouten, technische JSON-import/export,
routefocus en eenvoudige not-foundweergaven.

Deze helpers vormen geen generiek framework. Modules houden hun eigen
datamodel, validatie, normalisatie, sessiegedrag, scherminhoud en
bestandsworkflow. Een generieke sessiekern wordt bewust uitgesteld totdat een
tweede volwaardige module laat zien welke sessiepatronen werkelijk gedeeld
moeten worden.

## Mediaregister

Vanaf Sprint 7A bestaat Media als centrale registry voor bestaande assets. De
module beheert metadata, relatieve projectpaden, rechtenstatus en eenvoudige
bestandscontrole binnen de statische Studio-werksessie.

Media uploadt of verplaatst geen bestanden en schrijft niet naar de repository.
Bestaande velden zoals `logo`, `image`, `pdfFile` en `thumbnail` blijven in hun
eigen contentmodules bestaan. Een eventuele migratie naar `mediaAssetId`-
relaties is een latere architectuurbeslissing.

## Kennisbankregistry

Vanaf Sprint 8A bestaat Kennisbank als eigen Studio-contentmodule voor
artikelen. De module gebruikt `data/articles.json`, een eigen datamodel, eigen
validatie, eigen normalisatie, eigen import/exportworkflow en een eigen
in-memory sessie.

Artikelen blijven een statische registry voor toekomstige publieke
website-integratie. Studio schrijft geen artikelen naar de repository en koppelt
deze data nog niet aan de publieke website. Relaties met leveranciers en
brochures worden gevalideerd via bestaande id's. Hero-afbeeldingen blijven
relatieve projectpaden; een migratie naar `mediaAssetId` is uitgesteld.

Vanaf Sprint 8B heeft de kennisbank een modulespecifieke kwaliteitslaag voor
statusregels, relatiecontrole en mediawaarschuwingen. Deze laag gebruikt de
actieve browserwerksessie en vormt geen generieke CMS-engine.

Vanaf Sprint 8C gebruikt Studio een kleine gedeelde leeshelper voor
contentrelaties. Deze helper zoekt bestaande relaties tussen leveranciers,
brochures, kennisbankartikelen en media op basis van bestaande id- en
padvelden. De helper muteert geen data, schrijft niets weg en is geen generieke
relation engine.

## Publieke contentprojecties

Vanaf Sprint 11B/11C rendert de publieke website kennisbankartikelen niet meer
rechtstreeks uit `data/articles.json`. Studio blijft de bron, maar de website
leest een gecontroleerde projectie uit `data/public/articles.json`. Vanaf
Sprint 11D geldt hetzelfde voor leveranciers via `data/public/suppliers.json`
en vanaf Sprint 11F voor brochures via `data/public/brochures.json`.

De projectie bevat alleen bezoekersvelden en wordt berekend met gedeelde
helpers in `shared/`. Interne Studio-velden zoals status, ruwe relatievelden,
governance, readiness, opslagmetadata en validatieinformatie worden niet in
publieke datasets opgenomen. Checks vergelijken de publieke dataset met de
bestaande Studio-data en signaleren afwijkingen; ze corrigeren niets
automatisch.

Vanaf Sprint 11E mogen publieke projecties onderling veilige relatieobjecten
bevatten, bijvoorbeeld publieke leveranciers bij kennisbankartikelen en
publieke kennisbankartikelen bij leveranciers. Deze relaties worden nog steeds
berekend uit de bestaande Studio-id-relaties, maar alleen wanneer beide kanten
publiek zijn. Ruwe relatievelden zoals `supplierIds` en interne governance- of
readinessdata blijven buiten de websiteprojecties.

Vanaf Sprint 11F geldt dit ook voor brochures. Publieke brochures verwijzen
alleen naar publieke leveranciers, en publieke leveranciers kunnen gerelateerde
publieke brochures tonen. Downloadlinks worden alleen gepubliceerd wanneer het
relatieve PDF-bestand daadwerkelijk beschikbaar is.

Voor leveranciers bevat de eerste publieke projectie alleen bestaande
bezoekersvelden: id, slug, naam, type, samenvatting, omschrijving, categorieen,
logo en afbeelding. Interne velden zoals status, sortering, uitlichting,
relaties, governance en readiness blijven buiten de publieke projectie. De
eerste publieke leverancierspagina toont alleen overzichtskaarten en een
eenvoudige detailbasis. Media-, bibliotheek- en complexe relatieblokken blijven
buiten scope.

## Content Governance

Vanaf Sprint 10A bestaat er een read-only governance-laag bovenop de bestaande
Studio-modules. Deze laag verzamelt bestaande validators, quality-rapporten,
modulecounts en contentrelaties in een samenvattend overzicht.

Governance introduceert geen nieuwe opslaglaag, backend, publicatieflow,
repositorywrite of relationeel datamodel. De helper muteert geen data en
dupliceert geen modulevalidatie; leveranciers, brochures, media, kennisbank en
bibliotheek blijven hun eigen datamodel en validatieregels houden.

## Bibliotheekregistry

Vanaf Sprint 9A bestaat Bibliotheek als eigen Studio-contentmodule voor
documenten en bronnen. De module gebruikt `data/library.json`, een eigen
datamodel, eigen validatie, eigen normalisatie en een eigen in-memory sessie.

Bibliotheekitems blijven in deze fase een statisch Studio-register. Vanaf
Sprint 9B heeft Bibliotheek een modulespecifieke import/exportworkflow voor
`library.json` en een kwaliteitslaag voor structuur, statusregels,
bestandspaden, mediawaarschuwingen en relaties met leveranciers, brochures en
kennisbankartikelen.

Studio uploadt geen bestanden, genereert geen publieke downloads, schrijft niet
naar de repository en gebruikt geen backend. Bestands- en thumbnailpaden blijven
relatieve projectpaden; een migratie naar `mediaAssetId` is uitgesteld.
