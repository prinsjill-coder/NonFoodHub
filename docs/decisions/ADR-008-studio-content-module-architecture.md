# ADR-008 - Studio contentmodule-architectuur

## Status

Accepted

## Context

De leveranciersmodule is de eerste volwaardige Studio-module. Toekomstige
modules zoals brochures, kennisbankartikelen, bibliotheekitems, specialisten,
media en CTA's zullen vergelijkbare patronen gebruiken, maar hun datamodel,
validatie, normalisatie en bestandsworkflow zijn nog niet bewezen in
implementatie.

Te vroeg abstraheren zou de leveranciersmodule onnodig complex maken en kan
leiden tot een generieke CMS- of CRUD-engine die niet past bij de huidige
statische, frameworkloze Studio.

## Besluit

Studio gebruikt kleine gedeelde helpers voor aantoonbaar identiek UI- en
browsergedrag.

Gedeeld mogen worden:

- contentstatuslabels en statusvalidatie;
- formulierfoutgedrag, zoals wissen, `aria-invalid`, validatiesamenvatting en
  focus naar het eerste ongeldige veld;
- technische JSON-import/exporthandelingen, zoals extensiecontrole,
  bestandsgroottecontrole, FileReader-afhandeling, downloadstart, object-URL
  cleanup en busy-guards;
- kleine route- en not-foundhelpers voor titels en consistente herstelroutes.

Modules behouden eigen:

- datamodel;
- validatieregels;
- normalisatie;
- formulierinhoud;
- schermteksten;
- import- en exportbestandsnaam;
- sessiegedrag en bestandsworkflow.

Er wordt geen generiek CMS-framework, CRUD-framework, modulegenerator,
repositorylaag of brede moduleconfiguratie gebouwd.

Een generieke sessiekern wordt uitgesteld totdat minimaal een tweede volwaardige
module concrete hergebruikspatronen bewijst.

## Alternatieven

### Alle modulecode kopiëren

Dit zou de leveranciersmodule eenvoudig houden, maar zorgt bij iedere nieuwe
module voor herhaling in formulierfouten, import/exporttechniek en
route-afhandeling.

### Volledige generieke module-engine

Dit zou veel configuratie mogelijk maken, maar is te abstract voor de huidige
fase. Er is nog maar één volledige module, waardoor de echte variatie tussen
modules onvoldoende bewezen is.

### Beperkte gedeelde toolkit

Dit behoudt expliciete modulecode en maakt alleen bewezen herhaalbaar gedrag
herbruikbaar. Dit is de gekozen richting.

## Gevolgen

- Enige expliciete duplicatie blijft toegestaan.
- Abstraheren gebeurt pas bij bewezen herhaling.
- De leveranciersmodule blijft de referentie-implementatie.
- Nieuwe modules kunnen bestaande helpers gebruiken zonder eraan vast te zitten.
- Supplier-specifieke bedrijfsregels blijven zichtbaar in supplierbestanden.
- De statische import/export-werksessie uit ADR-007 blijft leidend.
