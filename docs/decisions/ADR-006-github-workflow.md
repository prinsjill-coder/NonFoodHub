# ADR-006 - GitHub Desktop workflow

## Status

Accepted

## Context

De GitHub-integratie in Codex werkte niet betrouwbaar voor pushen. GitHub Desktop werkt wel betrouwbaar en geeft controle over wijzigingen.

## Besluit

Codex wijzigt bestanden lokaal. De gebruiker beoordeelt wijzigingen, commit en pusht via GitHub Desktop.

Codex maakt geen commits en pusht niet zelfstandig.

## Gevolgen

- Meer controle voor de gebruiker.
- Minder afhankelijkheid van de GitHub-plugin.
- Iedere wijziging is zichtbaar in GitHub Desktop.
- Publicatie via GitHub Pages volgt na push naar `main`.
