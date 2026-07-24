# ADR-003 - Virtuele showroom via Kuula

## Status

Accepted

## Context

De pagina Virtuele Showroom toont in Fase 1 nog een gewone afbeelding naast de tekst. De echte showroomtour staat in Kuula.

## Besluit

De Kuula-tour is het centrale element van de Virtuele Showroom:

```text
https://kuula.co/post/n1/collection/7D1QF
```

De pagina gebruikt een responsive embed of click-to-load embed met fallbackknop.

## Gevolgen

- Geen gewone rechterkolomfoto als vervanging van de tour.
- Embed URL wordt later centraal beheerbaar in Studio.
- Externe content krijgt fallbacklink en privacy-context.
