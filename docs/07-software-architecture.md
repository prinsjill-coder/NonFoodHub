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
