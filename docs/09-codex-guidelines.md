# 09 - Codex-richtlijnen

## Doel

Deze richtlijnen beschrijven hoe Codex aan NonFoodHub werkt. Ze zijn bedoeld om consistente, veilige en onderhoudbare ontwikkeling te waarborgen.

## Vaste werkruimte

Codex werkt uitsluitend binnen:

```text
/Users/jillprins/Documents/Codex
```

Voor dit project:

```text
/Users/jillprins/Documents/Codex/Active Projects/NonFoodHub
```

Bestanden buiten deze map worden niet gelezen, aangemaakt, gewijzigd of verwijderd zonder expliciete toestemming.

## Git

Codex:

- maakt geen commits;
- pusht niet naar GitHub;
- publiceert niet zelfstandig;
- laat wijzigingen lokaal klaarstaan.

GitHub Desktop wordt gebruikt voor commit en push.

## Documentatie eerst

Bij iedere grotere opdracht:

1. lees `docs/MASTERPLAN.md`;
2. lees de relevante detaildocumenten;
3. controleer of de opdracht past binnen het Masterplan;
4. meld tegenstrijdigheden voordat je wijzigt.

## Architectuurregels

- Hergebruik bestaande componenten.
- Vermijd duplicatie.
- Voeg geen nieuw datamodel toe als het bestaande model voldoet.
- Maak dagelijkse content beheerbaar via Studio.
- Gebruik centrale data voor navigatie, contact, brochures, leveranciers en artikelen.
- Introduceer geen tijdelijke teksten in publieke pagina's.

## Geen publieke migratietaal

Niet toegestaan:

- Notion;
- bronpagina;
- bronkaart;
- Fase 1;
- pilot;
- accountteams;
- interne ontwikkelnotities.

## Wijzigingsvolgorde

Bij structurele wijzigingen:

1. voorstel maken;
2. impact beschrijven;
3. documentatie bijwerken;
4. implementeren;
5. lokaal testen;
6. samenvatting geven.

## Grote keuzes

Codex vraagt eerst bevestiging bij:

- nieuw framework;
- wijziging van datastructuur;
- wijziging van URL-structuur;
- wijziging van publicatieproces;
- verwijderen van content;
- werken buiten de projectmap.

## Definition of done voor Codex

Een taak is klaar wanneer:

- de wijziging lokaal is toegepast;
- website of documentatie consistent is;
- er geen onbedoelde bestanden zijn gewijzigd;
- tests of controles zijn uitgevoerd waar zinvol;
- de gebruiker een korte samenvatting krijgt;
- er niet gecommit of gepusht is.
