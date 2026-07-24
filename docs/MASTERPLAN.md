# NonFoodHub Masterplan

> Versie: 1.0 concept  
> Status: levend projectdocument  
> Projectmap: `/Users/jillprins/Documents/Codex/Active Projects/NonFoodHub`  
> Publieke domeinrichting: bedoeld voor `nonfoodhub.nl`  
> Documenttype: functionele en architectonische projectblauwdruk

Dit document is de gezaghebbende index voor het NonFoodHub-platform. Bij tegenstrijdigheden tussen losse opdrachten, oudere chatteksten, eerdere projectnotities en deze documentatie is deze documentatieset leidend.

## Leeswijzer

NonFoodHub is meer dan een statische website. Het project ontwikkelt zich tot een beheerbaar digitaal platform voor Bidfood Non-Food. De publieke website toont inspiratie, leveranciers, brochures, diensten en contactmogelijkheden. NonFood Hub Studio wordt de beheeromgeving waarin content zonder code kan worden toegevoegd en onderhouden.

Gebruik dit bestand als startpunt. De detailuitwerking staat in de gekoppelde hoofdstukken.

## Kernbesluit

De eerstvolgende ontwikkelstap is niet het handmatig vullen van alle PDF's in HTML. Eerst wordt de website- en contentstructuur voorbereid op beheer via Studio. Daarna worden PDF's, leveranciers, afbeeldingen en kennisbankartikelen via die structuur toegevoegd.

## Documenten

1. [Visie, missie en scope](01-vision.md)
2. [Informatiearchitectuur](02-information-architecture.md)
3. [Functioneel ontwerp website](03-website.md)
4. [Contentmodel](04-content-model.md)
5. [NonFood Hub Studio](05-studio.md)
6. [Rollen en rechten](06-roles-permissions.md)
7. [Softwarearchitectuur](07-software-architecture.md)
8. [Design System](08-design-system.md)
9. [Codex-richtlijnen](09-codex-guidelines.md)
10. [Roadmap](10-roadmap.md)
11. [Governance en acceptatie](11-governance.md)
12. [Bijlagen](12-appendices.md)

## Diagrammen

- [Platformarchitectuur](diagrams/architecture.mmd)
- [Navigatie](diagrams/navigation.mmd)
- [Contentmodel](diagrams/content-model.mmd)
- [Studio workflow](diagrams/studio-flow.mmd)
- [Publicatieflow](diagrams/publish-flow.mmd)
- [Componentenkaart](diagrams/component-map.mmd)

## Wireframes

- [Homepage](wireframes/homepage.md)
- [Leverancierdetailpagina](wireframes/supplier-detail.md)
- [Brochureoverzicht](wireframes/brochure-overview.md)
- [Kennisbankartikel](wireframes/knowledge-article.md)
- [Studio dashboard](wireframes/studio-dashboard.md)
- [Studio brochureformulier](wireframes/studio-brochure-form.md)

## Architecture Decision Records

- [ADR-001: Navigatiestructuur](decisions/ADR-001-navigation.md)
- [ADR-002: PDF-beheer](decisions/ADR-002-pdf-handling.md)
- [ADR-003: Virtuele showroom via Kuula](decisions/ADR-003-showroom-kuula.md)
- [ADR-004: Contact en specialisten](decisions/ADR-004-contact-specialists.md)
- [ADR-005: Studio voor handmatige contentvulling](decisions/ADR-005-studio-before-manual-content.md)
- [ADR-006: GitHub Desktop workflow](decisions/ADR-006-github-workflow.md)
- [ADR-007: Studio import/export-werksessie](decisions/ADR-007-studio-import-export-session.md)

## Audit

- [Volledige audit van 2026-07-24](appendices/audit-2026-07-24.md)

## Definitieve uitgangspunten

- Werk uitsluitend binnen `/Users/jillprins/Documents/Codex`.
- Voor dit project wordt gewerkt in `/Users/jillprins/Documents/Codex/Active Projects/NonFoodHub`.
- Codex maakt geen commits en pusht niet naar GitHub.
- Versiebeheer loopt via GitHub Desktop.
- De publieke website bevat geen Notion-verwijzingen, bronpagina-teksten, bronkaart-teksten, pilotteksten of ontwikkelfase-teksten.
- `Actueel` wordt vervangen door `Inspiratie`.
- `Inspiratie` bevat `Kennisbank`.
- `Terras & Outdoor` wordt een kennisbankartikel en geen los hoofdmenu-item.
- `Droogijsshop` hoort onder `Ontdek`.
- Brochures openen direct als PDF.
- De virtuele showroom gebruikt de Kuula-tour als centraal element.
- Specialisten blijven zichtbaar en bereikbaar, maar worden centraal beheerd.
- Alle dagelijkse content moet uiteindelijk beheerbaar zijn via NonFood Hub Studio.

## Huidige prioriteiten

1. Website-framework en informatiearchitectuur corrigeren.
2. Migratietaal en Notion-verwijzingen verwijderen uit klantgerichte pagina's.
3. Navigatie gelijk trekken met dit Masterplan.
4. Centrale data introduceren voor navigatie, leveranciers, brochures, artikelen, contactroutes en media.
5. Eerste versie van NonFood Hub Studio bouwen.
6. Daarna pas echte PDF's, leveranciersdetails en bibliotheekitems op schaal toevoegen.

## Versiehistorie

| Versie | Datum | Status | Omschrijving |
| --- | --- | --- | --- |
| 1.0 concept | 2026-07-24 | Concept | Eerste geconsolideerde documentatieset op basis van audit en projectgesprekken. |
