# ADR-001 - Navigatiestructuur

## Status

Accepted

## Context

De Fase 1-site had een menu-item `Actueel` met onder andere `Nieuw`, `Aanbiedingen`, `Terras & Outdoor` en `Droogijs Shop`. Dit sloot niet goed aan op de gewenste klantreis en maakte de informatiearchitectuur onduidelijk.

## Besluit

De hoofdstructuur wordt:

```text
Home
Ontdek
Inspiratie
Services
Contact
```

`Actueel` vervalt. `Inspiratie` bevat `Kennisbank`. `Droogijsshop` verhuist naar `Ontdek`. `Terras & Outdoor` wordt een kennisbankartikel en geen los hoofdmenu-item.

## Gevolgen

- Header, mobiel menu en footer worden gelijkgetrokken.
- Navigatie wordt later centraal beheerd als data.
- Artikelen gebruiken een uniforme structuur.
