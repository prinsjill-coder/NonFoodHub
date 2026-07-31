# 05 - NonFood Hub Studio

## Doel

NonFood Hub Studio is de beheeromgeving voor het volledige platform. Alle content die zichtbaar is op de publieke website wordt uiteindelijk via Studio beheerd.

Studio is geen JSON-editor en geen technische configuratieomgeving. Het is een formuliergestuurde werkplek voor contentbeheerders en Bidfood Non-Food specialisten.

## Ontwerpprincipes

- Geen technische kennis vereist.
- Alle beheer verloopt via formulieren.
- Content wordt centraal opgeslagen.
- Concepten kunnen worden opgeslagen zonder publicatie.
- Publiceren is bewust en controleerbaar.
- Relaties worden geselecteerd via keuzelijsten.
- Media en PDF's worden beheerd vanuit een centrale bibliotheek.

## Gedeelde Studio-helpers

Studio gebruikt een beperkte gedeelde toolkit voor gedrag dat aantoonbaar in
meerdere modules terugkomt. Voorbeelden zijn contentstatuslabels,
formulierfoutgedrag, technische JSON-bestandshandelingen, routefocus en nette
not-foundweergaven.

Modules blijven zelf verantwoordelijk voor hun datamodel, validatieregels,
normalisatie, formulierinhoud, schermteksten, sessiegedrag en import- of
exportbestandsnaam. Er is geen generieke CMS-engine, CRUD-engine,
modulegenerator of generieke sessiekern.

## Hoofdmenu

```text
Dashboard
Homepage
Leveranciers
Brochures
Kennisbank
Bibliotheek
Virtuele Showroom
Droogijsshop
Specialisten
Media
CTA's
Navigatie
Instellingen
```

## Dashboard

Het dashboard toont:

- aantal leveranciers;
- aantal brochures;
- aantal kennisbankartikelen;
- aantal bibliotheekitems;
- concepten;
- recent gepubliceerde items;
- ontbrekende PDF's;
- ontbrekende afbeeldingen;
- snelle acties.

Snelle acties:

- nieuwe leverancier;
- nieuwe brochure;
- nieuw artikel;
- nieuw bibliotheekitem;
- specialist toevoegen.

## Homepagebeheer

De homepage bestaat uit beheerbare secties:

- Hero
- Introductie
- Uitgelichte leveranciers
- Inspiratie
- Brochures
- Virtuele Showroom
- Droogijsshop
- Contactblok

Per sectie:

- tonen/verbergen;
- volgorde;
- titel;
- tekst;
- afbeelding;
- CTA's;
- gekoppelde content.

## Leveranciersbeheer

Workflow:

```text
Nieuwe leverancier
-> basisgegevens invullen
-> logo uploaden
-> afbeelding kiezen
-> omschrijving schrijven
-> brochures koppelen
-> gerelateerde artikelen kiezen
-> opslaan als concept of publiceren
```

### Leveranciers import/export in statische Studio

Zolang Studio statisch op GitHub Pages draait, schrijft Studio niet rechtstreeks
naar repositorybestanden, GitHub of de live website. `data/suppliers.json` wordt
als gebundelde bron geladen. Daarna bestaan wijzigingen alleen in het actieve
browsergeheugen.

Sprint 3 gebruikt deze werksessie:

```text
data/suppliers.json laden
-> in-memory workingData maken
-> leveranciers aanmaken of bewerken in workingData
-> volledig valideren
-> suppliers.json exporteren als download
-> bestand handmatig vervangen in /data
-> commit en push via GitHub Desktop
```

Een geldige import van een bestaand `suppliers.json`-bestand vervangt alleen de
actieve werksessiebron. Importeren publiceert niets en schrijft niets terug naar
de repository. Een browserrefresh wist niet-geexporteerde werksessiewijzigingen.

Import accepteert alleen `.json`-bestanden tot maximaal 1 MB. Fouten bij
selecteren, lezen, parsen of valideren wijzigen de actieve werksessie niet.

De status `published` is alleen een contentstatus binnen data. Deze status
betekent niet dat Studio automatisch publiceert of de live website wijzigt.

## Brochurebeheer

Workflow:

```text
Nieuwe brochure
-> leverancier kiezen
-> PDF uploaden
-> cover uploaden
-> titel en metadata invullen
-> controleren
-> publiceren
```

Bij vervanging van een PDF blijven bestaande koppelingen bestaan.

### Brochures import/export in statische Studio

Zolang Studio statisch draait, schrijft brochurebeheer niet rechtstreeks naar
repositorybestanden, GitHub of de live website. `data/brochures.json` wordt als
gebundelde bron geladen. Daarna bestaan wijzigingen alleen in het actieve
browsergeheugen.

Sprint 6B gebruikt deze werksessie:

```text
data/brochures.json laden
-> in-memory workingData maken
-> brochures aanmaken of bewerken in workingData
-> brochures.json importeren en valideren
-> import na bevestiging toepassen op de browserwerksessie
-> volledig valideren
-> brochures.json exporteren als download
-> bestand handmatig vervangen in /data
-> commit en push via GitHub Desktop
```

Een geldige import vervangt alleen de actieve brochurewerksessie nadat de
gebruiker dit bevestigt. Importeren publiceert niets en schrijft niets terug
naar de repository. Onbekende velden geven waarschuwingen, maar worden niet
opgeslagen in de definitieve brochurewerksessie en niet meegenomen in de
genormaliseerde export.

PDF-upload, thumbnail-upload, mediaopslag en automatische publicatie zijn nog
niet actief.

## Kennisbankbeheer

Artikelen worden beheerd met een eenvoudige editor.

Ondersteund:

- titel;
- slug;
- samenvatting;
- hero afbeelding;
- tekstblokken;
- afbeeldingen;
- gerelateerde leveranciers;
- gerelateerde brochures;
- CTA's;
- status.

### Kennisbankregistry in statische Studio

Sprint 8A introduceert kennisbankartikelen als aparte Studio-module.
`data/articles.json` wordt als gebundelde bron geladen en wijzigingen bestaan
alleen in de actieve browserwerksessie.

Artikelen kunnen worden bekeken, aangemaakt en bewerkt binnen Studio. Opslaan
past alleen `workingData` in browsergeheugen aan. Vanaf Sprint 8B kan
`articles.json` ook worden geimporteerd, gevalideerd en als genormaliseerde
download worden geexporteerd. Importeren en exporteren schrijven niets naar de
repository en publiceren niets.

Vanaf Sprint 8A.1 bevat de kennisbankconfiguratie minimaal deze categorieen:
Inspiratie, Terras & Outdoor, Tafelpresentatie, Buffet & presentatie,
Gastbeleving, Koffie & dranken en Trends. Artikelen zijn alleen geldig wanneer
minimaal een bekende categorie is gekozen.

Hero afbeeldingen blijven in deze sprint relatieve projectpaden, zoals
`assets/images/blog-terras.png`. Automatische koppeling met MediaAsset volgt in
een latere sprint. Wanneer een pad niet in `media.json` staat, toont validatie
alleen een waarschuwing; dit blokkeert opslaan niet.

Sprint 8B voegt een kennisbankkwaliteitsrapport toe. Dit rapport controleert
basisvelden, statusregels, hero-afbeeldingen en relaties met leveranciers,
brochures en media. Concepten mogen onvolledig blijven; artikelen in review
hebben minimaal titel, slug, samenvatting en categorie nodig; gepubliceerde
artikelen hebben daarnaast inhoud en een hero-afbeelding nodig.

## Bibliotheekbeheer

Voor algemene downloads:

- titel;
- beschrijving;
- categorie;
- bestand;
- afbeelding;
- zichtbaarheid;
- status.

## Showroombeheer

Beheerbare velden:

- titel;
- introductie;
- Kuula-tour URL;
- embed URL;
- fallbackknop;
- privacytekst;
- gekoppelde specialisten.

## Droogijsshopbeheer

Beheerbare velden:

- titel;
- uitleg;
- Google Form URL;
- formulierweergave;
- FAQ;
- contact voor vragen.

Bestellingen gaan via Google Form, niet via e-mail.

## Specialistenbeheer

Specialisten worden eenmalig ingevoerd en kunnen op meerdere pagina's worden getoond.

Velden:

- naam;
- functie;
- foto;
- e-mail;
- telefoon;
- regio;
- specialisme;
- status;
- volgorde.

## Media

Mediabeheer ondersteunt:

- afbeeldingen;
- logo's;
- thumbnails;
- PDF's;
- alt-tekst;
- bestandsgrootte;
- gebruiksrol;
- rechtenstatus.

Studio moet later helpen bij beeldverhoudingen en bestandsgrootte.

### Mediaregister in statische Studio

Sprint 7A introduceert Media als centraal register voor bestaande assets.
Media-items registreren metadata en relatieve projectpaden naar bestanden die
handmatig in de repository staan. Studio uploadt geen bestanden, plaatst geen
bestanden in `assets/` en schrijft niet naar de repository.

Bestaande padvelden zoals `pdfFile`, `thumbnail`, `logo` en `image` blijven in
deze sprint bestaan. Er vindt nog geen migratie naar `mediaAssetId`-relaties
plaats.

De browser controleert alleen structuur, metadata en padvormen. Diepere
bestandscontroles, zoals of een geregistreerd bestand fysiek aanwezig is, horen
in lokale scripts en handmatige QA.

## Validatie

Publiceren is niet mogelijk bij:

- ontbrekende verplichte velden;
- dubbele slug;
- ontbrekende PDF;
- ontbrekende alt-tekst bij relevante afbeelding;
- ongeldige URL;
- niet-goedgekeurde contactgegevens.

## Eerste versie van Studio

De eerste praktische Studio hoeft nog geen volledige backend te hebben. Een realistische tussenstap is:

1. centrale datafiles introduceren;
2. formulieren bouwen die data voorbereiden of aanpassen;
3. wijzigingen lokaal laten controleren;
4. GitHub Desktop gebruiken voor commit en push.

Zo blijft de workflow gratis en beheersbaar, terwijl de website niet handmatig in HTML gevuld hoeft te worden.
