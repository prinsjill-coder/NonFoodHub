# 11 - Governance en acceptatie

## Doel

Governance beschrijft hoe NonFoodHub beheerd en doorontwikkeld wordt. Het doel is kwaliteit, consistentie en continuiteit.

## Rollen in het project

### Product Owner

Verantwoordelijk voor:

- visie;
- prioriteiten;
- acceptatie;
- inhoudelijke keuzes.

### Ontwikkeling

Verantwoordelijk voor:

- technische implementatie;
- architectuur;
- performance;
- toegankelijkheid;
- onderhoudbaarheid.

### Contentbeheer

Verantwoordelijk voor:

- leveranciers;
- brochures;
- artikelen;
- bibliotheek;
- media;
- specialisten.

### Specialisten

Verantwoordelijk voor:

- inhoudelijke expertise;
- productadvies;
- klantcontact;
- actualiteit van eigen contactgegevens.

## Wijzigingsproces

Structurele wijziging:

```text
Voorstel
-> impactanalyse
-> akkoord
-> documentatie aanpassen
-> implementeren
-> lokaal testen
-> commit via GitHub Desktop
-> push
-> live controle
```

Voor statische Studio-import/export geldt aanvullend:

```text
Suppliers-data laden of importeren
-> wijzigen in browsergeheugen
-> volledig valideren
-> suppliers.json exporteren
-> /data/suppliers.json handmatig vervangen
-> lokaal testen
-> commit en push via GitHub Desktop
-> live controle
```

Een exportbestand is pas onderdeel van het project nadat het handmatig in de
repository is geplaatst. Downloaden vanuit Studio geldt niet als opslaan,
publiceren, committen of pushen.

De vaste handmatige QA-procedure voor Studio staat in
[appendices/studio-qa-checklist.md](appendices/studio-qa-checklist.md).

Nieuwe Studio-modules mogen gedeelde helpers gebruiken voor bewezen identiek
gedrag. Modules moeten hun eigen datamodel, validatieregels, normalisatie,
schermteksten en bestandsworkflow expliciet houden totdat hergebruik in
meerdere volwaardige modules is bewezen.

## Acceptatiecriteria

Een onderdeel is gereed wanneer:

- functionaliteit werkt;
- responsive gedrag klopt;
- design system is gevolgd;
- toegankelijkheid is gecontroleerd;
- er geen publieke migratietaal zichtbaar is;
- content via data of Studio beheerbaar is;
- documentatie is bijgewerkt;
- links en bestanden werken;
- er geen gevoelige gegevens onbedoeld gepubliceerd worden.

## Definition of Done

Een taak is afgerond als:

- de wijziging is uitgevoerd;
- lokale controle heeft plaatsgevonden;
- relevante documentatie klopt;
- GitHub Desktop de wijziging toont;
- er een duidelijke commitsamenvatting kan worden gebruikt;
- de live website na push kort gecontroleerd kan worden.

## Onderhoud

Regulier onderhoud:

- PDF's actualiseren;
- leveranciersinformatie bijwerken;
- kennisbank uitbreiden;
- afbeeldingen optimaliseren;
- contactgegevens controleren;
- dependency- en beveiligingsupdates uitvoeren wanneer er later tooling komt.

## Rechten en privacy

Specialistgegevens mogen publiek blijven omdat persoonlijk contact een belangrijk uitgangspunt is. Wel moeten zij centraal beheerd en periodiek gecontroleerd worden.

Leverancierscontactgegevens worden niet standaard gepubliceerd. Klantvragen lopen primair via Bidfood Non-Food.
