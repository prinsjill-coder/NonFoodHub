# ADR-002 - PDF-beheer en brochuregedrag

## Status

Accepted

## Context

De Fase 1-site bevat brochurekaarten met PDF-bestandsnamen, maar knoppen linken nog naar externe bronkaarten. Bezoekers moeten uiteindelijk direct brochures kunnen openen.

## Besluit

Brochures worden als PDF-assets beheerd en openen direct in een nieuw tabblad.

Publieke knoptekst:

```text
Bekijk brochure
```

De adviesknop wordt:

```text
Vraag productadvies
```

## Gevolgen

- Geen Notion-links op de brochurepagina.
- PDF's worden opgeslagen onder `assets/downloads/brochures/`.
- Iedere brochure wordt gekoppeld aan een leverancier.
- PDF-metadata wordt beheerd via Studio.
