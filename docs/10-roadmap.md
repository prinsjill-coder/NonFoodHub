# 10 - Roadmap

## Werkvolgorde vanaf nu

De website staat online als Fase 1-basis. De volgende stappen moeten dubbel werk voorkomen.

Aanvullend besluit: het fundament van NonFood Hub Studio mag nu worden gebouwd
als technische basis, terwijl de publieke contentcorrecties uit Fase 1A later
worden afgerond. Dit Studio-fundament bevat alleen routing, layout, sidebar,
dashboard, navigatiestructuur, authentication placeholder, gedeelde componenten
en basisarchitectuur. Het bevat nog geen CRUD, leveranciersbeheer,
brochurebeheer, homepage-editor, media- of contentbeheer.

Aanbevolen volgorde:

1. Fase 1A: framework en informatiearchitectuur corrigeren.
2. Fase 2A: minimale Studio en centrale data opzetten.
3. Fase 1B: echte content vullen via data/Studio.
4. Publicatie onder `nonfoodhub.nl`.
5. Fase 2B en verder: optimalisaties en uitbreidingen.

## Fase 1A - Fundament strak trekken

Doel:

- navigatie corrigeren;
- Notion- en migratietaal verwijderen;
- Kuula-tour integreren;
- Google Form voor droogijs toevoegen;
- afbeeldingsrichtlijnen toepassen;
- contactgegevens centraliseren;
- SEO-basis voorbereiden;
- contentstructuur klaarzetten voor data.

Geen grootschalige handmatige PDF-vulling in HTML.

## Fase 2A - Studio basis

Doel:

- centrale datafiles;
- leveranciersbeheer;
- leveranciers importeren, in de Studio-werksessie wijzigen en als
  gevalideerde `suppliers.json` exporteren;
- brochurebeheer;
- PDF-upload of PDF-koppeling;
- kennisbankbeheer;
- mediabeheer;
- contact- en specialistbeheer;
- navigatiebeheer.

De eerste versie mag lokaal werken met GitHub Desktop als publicatiestap.

Aanvullend Sprint 3-besluit: leverancierswijzigingen bestaan in deze fase alleen
in browsergeheugen totdat een beheerder `suppliers.json` exporteert. Exporteren
is geen opslag, publicatie of commit. Het gedownloade bestand wordt handmatig in
`/data` geplaatst en daarna via GitHub Desktop gecommit en gepusht.

Aanvullend Sprint 5-besluit: voordat nieuwe Studio-modules worden gebouwd,
wordt alleen bewezen herhaalbaar Studio-gedrag gedeeld via kleine helpers.
Leveranciersbeheer blijft de referentie-implementatie. Een generieke
sessiekern, CRUD-engine of modulegenerator blijft buiten scope totdat minimaal
een tweede volwaardige module concrete hergebruikspatronen bewijst.

Aanvullend Sprint 6B-besluit: brochurebeheer gebruikt nu dezelfde statische
overdrachtslogica als principe, maar blijft modulespecifiek. Brochuredata kan in
de actieve browserwerksessie worden aangepast, als `brochures.json` worden
geexporteerd en na validatie worden geimporteerd. Downloaden of importeren is
geen opslag, publicatie, commit of push; GitHub Desktop blijft de handmatige
publicatiestap.

Aanvullend Sprint 7A-besluit: Media wordt eerst een register voor bestaande
assets. Bestaande padvelden in leveranciers en brochures blijven voorlopig
bestaan; er is nog geen migratie naar `mediaAssetId`, geen uploadfunctionaliteit
en geen automatische bestandsplaatsing.

Aanvullend Sprint 8A-besluit: Kennisbankartikelen worden als aparte
Studio-module toegevoegd. `data/articles.json` fungeert als statische
contentregistry met een in-memory werksessie. Er is nog geen import/export,
geen publieke websitekoppeling, geen rich-text/blokkeneditor en geen migratie
naar `mediaAssetId`.

Aanvullend Sprint 8A.1-besluit: De kennisbankcategorieen bevatten minimaal
Inspiratie, Terras & Outdoor, Tafelpresentatie, Buffet & presentatie,
Gastbeleving, Koffie & dranken en Trends. Het formulier gebruikt het veldlabel
Hero afbeelding (relatief pad), opgeslagen als `heroImage`. Ontbrekende
registratie in `media.json` is alleen een waarschuwing en blokkeert de
werksessie niet.

Aanvullend Sprint 8B-besluit: Kennisbankbeheer ondersteunt modulespecifieke
import/export voor `articles.json`, een kwaliteitsrapport, cross-module
relatiecontrole en dashboardinzichten voor artikelkwaliteit. De werkwijze blijft
statisch en handmatig: exporteren is een download, geen opslag, publicatie,
commit of push.

Aanvullend Sprint 8C-besluit: Studio toont bestaande contentrelaties op
detailpagina's en in beperkte dashboardmetrics. Relaties worden gelezen uit
bestaande id- en padvelden; er is geen nieuw opslagmodel, geen mediaAssetId-
migratie en geen generieke relation engine.

## Fase 1B - Content vullen

Wanneer data en Studio-basis staan:

- PDF's toevoegen;
- leverancierbrochures koppelen;
- bibliotheekitems toevoegen;
- kennisbankartikelen gelijk trekken;
- afbeeldingen vervangen en optimaliseren.

## Fase 2B - Websitekwaliteit

- volledige zoekfunctie;
- filters;
- supplier detail pages;
- SEO/social previews;
- sitemap;
- 404-pagina;
- performance-optimalisatie;
- toegankelijkheidsverbeteringen.

## Fase 3 - Platformuitbreiding

Mogelijk later:

- rollen en rechten;
- publicatieplanning;
- analytics;
- AI-contentassistent;
- CRM/ERP-koppelingen;
- SSO;
- leveranciersportaal.

## Dagenplanning indicatief

Als er de komende dagen meerdere uren per dag beschikbaar zijn:

- Dag 1: Fase 1A specificeren en uitvoeren.
- Dag 2: data-laag en eerste Studio-ontwerp bouwen.
- Dag 3: brochure- en leveranciersbeheer werkend maken.
- Dag 4: eerste content via Studio/data vullen.
- Dag 5: testen, polish en voorbereiding domeinkoppeling.

Deze planning is indicatief en afhankelijk van beschikbare PDF's, afbeeldingen en contactbesluiten.
