# 04 - Contentmodel

## Doel

Het contentmodel beschrijft welke soorten informatie NonFoodHub beheert en hoe deze informatie onderling samenhangt.

Het model is de basis voor:

- de publieke website;
- NonFood Hub Studio;
- zoekfunctionaliteit;
- PDF-beheer;
- toekomstige uitbreidingen.

Content mag niet verspreid of dubbel hardcoded worden. Ieder object bestaat een keer en wordt hergebruikt waar nodig.

## Hoofdobjecten

| Object | Doel |
| --- | --- |
| Supplier | Leverancier of partner |
| Brochure | PDF gekoppeld aan een leverancier |
| KnowledgeArticle | Kennisbankartikel |
| LibraryItem | Algemene download of bibliotheekitem |
| Specialist | Bidfood Non-Food contactpersoon |
| ContactRoute | Centrale contactroute of specialistcontact |
| MediaAsset | Afbeelding, logo, thumbnail of bestand |
| NavigationItem | Menu- en footeritem |
| CTA | Herbruikbare call-to-action |
| Showroom | Virtuele showroomconfiguratie |
| DryIceInfo | Droogijsshopconfiguratie |

## Supplier

Een leverancier kan nul, een of meerdere brochures hebben.

Velden:

- `id`
- `name`
- `slug`
- `type`
- `summary`
- `description`
- `categories`
- `logo`
- `image`
- `brochureIds`
- `relatedArticleIds`
- `featured`
- `sortOrder`
- `status`

Contact met individuele leveranciers wordt niet als standaard publieke route getoond. De primaire route loopt via Bidfood Non-Food.

## Brochure

Een brochure is een PDF die meestal bij precies een leverancier hoort.

Velden:

- `id`
- `title`
- `supplierId`
- `slug`
- `year`
- `categories`
- `pdfFile`
- `pdfSize`
- `thumbnail`
- `description`
- `language`
- `status`
- `sortOrder`
- `updatedAt`

Publiek gedrag:

- knoptekst: `Bekijk brochure`;
- opent direct PDF in nieuw tabblad;
- geen Notion-link;
- geen tussenpagina.

## KnowledgeArticle

Alle blogs, inspiratiepagina's en kennisbankitems gebruiken hetzelfde object.

Velden:

- `id`
- `title`
- `slug`
- `summary`
- `heroImage`
- `category`
- `tags`
- `publishedAt`
- `updatedAt`
- `body`
- `relatedSupplierIds`
- `relatedBrochureIds`
- `relatedLibraryItemIds`
- `status`
- `sortOrder`

`Terras & Outdoor` is een KnowledgeArticle, geen aparte hoofdpagina.

## LibraryItem

De bibliotheek bevat downloads die niet direct leverancierbrochures zijn.

Velden:

- `id`
- `title`
- `slug`
- `summary`
- `image`
- `file`
- `category`
- `brand`
- `visibleFrom`
- `visibleUntil`
- `status`
- `sortOrder`

## Specialist

Specialisten blijven zichtbaar op de website en worden centraal beheerd.

Velden:

- `id`
- `name`
- `role`
- `photo`
- `email`
- `phone`
- `region`
- `specialism`
- `status`
- `sortOrder`

Relaties:

- kan gekoppeld worden aan contactpagina;
- kan gekoppeld worden aan showroom;
- kan gekoppeld worden aan artikelen;
- kan gekoppeld worden aan leveranciers wanneer inhoudelijk logisch.

## ContactRoute

Contactroutes centraliseren algemene contactinformatie.

Velden:

- `id`
- `label`
- `type`
- `value`
- `url`
- `isCentral`
- `personId`
- `privacyApproved`
- `status`

Voorbeelden:

- `nonfood@bidfood.nl`
- centraal telefoonnummer;
- WhatsApp;
- specialist e-mail;
- specialist telefoonnummer.

## MediaAsset

Alle afbeeldingen en bestanden krijgen metadata.

Velden:

- `id`
- `title`
- `file`
- `type`
- `alt`
- `caption`
- `width`
- `height`
- `fileSize`
- `usageType`
- `rightsStatus`
- `status`

## CTA

CTA's worden centraal beheerd.

Velden:

- `id`
- `label`
- `buttonText`
- `url`
- `type`
- `icon`
- `status`

Voorbeelden:

- `Bekijk brochure`
- `Vraag productadvies`
- `Bezoek showroom`
- `Bestel droogijs`
- `Neem contact op`

## NavigationItem

Velden:

- `id`
- `label`
- `url`
- `group`
- `parentId`
- `description`
- `showInHeader`
- `showInFooter`
- `showInMobile`
- `sortOrder`
- `status`

Header, mobiel menu en footer worden uit dezelfde navigatiedata opgebouwd.

## Showroom

Velden:

- `id`
- `title`
- `summary`
- `heroImage`
- `tourUrl`
- `embedUrl`
- `embedProvider`
- `ctaId`
- `privacyNote`
- `status`

Provider voor versie 1: Kuula.

## DryIceInfo

Velden:

- `id`
- `title`
- `summary`
- `heroImage`
- `orderFormUrl`
- `embedAllowed`
- `packages`
- `deliveryInfo`
- `safetyItems`
- `useCases`
- `questionContactEmail`
- `status`

Bestellen loopt via Google Form. E-mail is alleen voor vragen.

## Publicatiestatussen

Alle beheerbare objecten gebruiken dezelfde statussen:

- `concept`
- `review`
- `published`
- `hidden`
- `archived`

## Relaties

```text
Supplier
  -> Brochure
  -> KnowledgeArticle
  -> MediaAsset

KnowledgeArticle
  -> Supplier
  -> Brochure
  -> LibraryItem
  -> Specialist

HomepageSection
  -> Supplier
  -> Brochure
  -> KnowledgeArticle
  -> CTA

Contact
  -> ContactRoute
  -> Specialist
```

## Bestandsopslag

Aanbevolen mappen:

```text
assets/downloads/brochures/
assets/downloads/bibliotheek/
assets/downloads/aanbiedingen/
assets/images/
```

Bestandsnamen:

- lowercase;
- geen spaties;
- koppeltekens;
- leverancier, onderwerp en jaar waar relevant.

Voorbeeld:

```text
churchill-combined-brochure-2026-eu.pdf
```
