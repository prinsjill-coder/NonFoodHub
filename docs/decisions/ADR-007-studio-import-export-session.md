# ADR-007 - Studio import/export-werksessie

## Status

Accepted

## Context

NonFood Hub Studio draait voorlopig statisch en moet geschikt blijven voor
GitHub Pages. De browser kan en mag niet rechtstreeks naar repositorybestanden,
GitHub of de live website schrijven. Tegelijk moet leveranciersbeheer al
bruikbaar worden om data veilig voor te bereiden.

## Besluit

Studio gebruikt voor leveranciersbeheer een tijdelijke in-memory werksessie.
`data/suppliers.json` wordt geladen als gebundelde bron. Een geldig geimporteerd
`suppliers.json`-bestand mag deze actieve bron vervangen. Wijzigingen bestaan
alleen in `workingData` in het browsergeheugen.

Studio kan een volledig gevalideerd en deterministisch genormaliseerd bestand
downloaden met exact de naam:

```text
suppliers.json
```

Exporteren is alleen een overdrachtsstap. De beheerder vervangt daarna handmatig
`/data/suppliers.json`, controleert lokaal en commit en pusht via GitHub Desktop.

Onbekende velden blokkeren import niet. Zij worden als waarschuwing getoond,
blijven tijdens de geimporteerde werksessie aanwezig en worden alleen verwijderd
bij het genereren van het genormaliseerde exportbestand.

De status `published` is alleen een contentstatus. Deze status publiceert niets
automatisch.

## Gevolgen

- Geen backend, GitHub API, automatische repositorywrites of automatische
  publicatie in deze fase.
- Geen `localStorage` of `sessionStorage`; een browserrefresh wist de actieve
  werksessie.
- Studio moet dirty-state, importbevestiging, sessieherstel, validatierapporten
  en exportstatus duidelijk tonen.
- Een toekomstige backend kan de in-memory sessieadapter later vervangen zonder
  het leveranciersformulier opnieuw te ontwerpen.
