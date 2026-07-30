# 12 - Bijlagen

## Bijlage A - Definitieve ontwerpbeslissingen

- De publieke naam is voorlopig `NonFoodHub`.
- Het domein is bedoeld als `nonfoodhub.nl`.
- `Actueel` wordt `Inspiratie`.
- `Inspiratie` bevat `Kennisbank`.
- `Terras & Outdoor` wordt een kennisbankartikel.
- `Droogijsshop` hoort onder `Ontdek`.
- `Virtuele Showroom` gebruikt de Kuula-tour als centraal element.
- Brochures openen direct als PDF.
- De knop `Open bronkaart` wordt `Bekijk brochure`.
- De knop `Vraag catalogusadvies` wordt `Vraag productadvies`.
- Notion-verwijzingen verdwijnen uit de publieke website.
- Specialisten blijven zichtbaar en bereikbaar.
- Contactgegevens worden centraal beheerd.
- Studio wordt gebouwd voordat alle PDF's handmatig worden toegevoegd.

## Bijlage B - Open beslissingen

Nog te bevestigen:

- definitieve centrale telefoonnummer;
- of `bibliotheek@bidfood.nl` blijft of alles via `nonfood@bidfood.nl` loopt;
- welke persoonlijke specialistgegevens publiek zichtbaar mogen blijven;
- welke PDF's publiek in de repository mogen staan;
- rechten op leverancierslogo's, brochurecovers en afbeeldingen;
- of de Kuula-tour direct embedt of click-to-load wordt;
- of het Google Form embedded wordt of via knop opent;
- definitieve URL-structuur voor kennisbankartikelen.

## Bijlage C - Audit-samenvatting

De volledige audit staat in [appendices/audit-2026-07-24.md](appendices/audit-2026-07-24.md).

De vaste Studio QA-checklist staat in
[appendices/studio-qa-checklist.md](appendices/studio-qa-checklist.md).

De audit van 2026-07-24 concludeert:

- de Fase 1-site is technisch stabiel;
- alle pagina's laden lokaal zonder consolefouten;
- mobiele navigatie, zoekoverlay en brochurefilter werken;
- grootste risico's zitten in contentstructuur en tijdelijke migratietaal;
- er zijn nog Notion-links en teksten zoals bronkaart/bronpagina;
- PDF's ontbreken als lokale assets;
- Kuula-tour is nog niet geintegreerd;
- Droogijsformulier is nog niet toegevoegd;
- content is hardcoded en moet naar centrale data;
- Studio moet worden gebouwd bovenop een contentmodel.

## Bijlage D - Aanbevolen eerste implementatieprompt

```text
Werk uitsluitend binnen /Users/jillprins/Documents/Codex en voor dit project binnen /Users/jillprins/Documents/Codex/Active Projects/NonFoodHub.

Lees eerst docs/MASTERPLAN.md, docs/02-information-architecture.md, docs/03-website.md, docs/04-content-model.md en docs/09-codex-guidelines.md.

Voer daarna Fase 1A uit: corrigeer de publieke website zodat navigatie, klantgerichte tekst, Kuula-showroom, droogijsformulier en brochureknoppen overeenkomen met de documentatie. Maak nog geen grootschalige handmatige PDF-vulling. Maak geen commit en push niets naar GitHub.
```

## Bijlage E - Repositoryregels

- Documentatie staat in `docs/`.
- Besluiten staan in `docs/decisions/`.
- Diagrammen staan in `docs/diagrams/`.
- Wireframes staan in `docs/wireframes/`.
- Root `README.md` blijft geschikt voor normale repositorybezoekers.
- `docs/MASTERPLAN.md` is de projectmatige ingang.
