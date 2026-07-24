# ADR-005 - Studio bouwen voor grootschalige handmatige contentvulling

## Status

Accepted

## Context

Er moeten nog veel PDF's, leveranciersinformatie, afbeeldingen en bibliotheekitems worden toegevoegd. Als dit eerst handmatig in HTML gebeurt, ontstaat dubbel werk zodra Studio wordt gebouwd.

## Besluit

Eerst wordt het websiteframework strakgetrokken en daarna wordt een minimale Studio/data-laag gebouwd. Pas daarna wordt content op schaal toegevoegd.

## Gevolgen

- Minder dubbel werk.
- Content wordt vanaf het begin gestructureerd.
- Brochures, leveranciers en artikelen worden beheerd via centrale data.
- De eerste Studio-versie mag lokaal werken met GitHub Desktop als publicatiestap.
