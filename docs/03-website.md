# 03 - Functioneel ontwerp website

## Home

De homepage is de centrale entree van NonFoodHub. De pagina inspireert en verwijst door naar de belangrijkste onderdelen.

Vaste secties:

1. Hero
2. Introductie
3. Uitgelichte leveranciers
4. Inspiratie / kennisbank
5. Brochures
6. Virtuele Showroom
7. Droogijsshop
8. Contact met specialisten
9. Footer

Iedere sectie moet later apart beheerbaar zijn vanuit Studio.

## Ontdek

`Ontdek` is de commerciele orientatiesectie. Deze bevat:

- Leveranciers & Assortiment
- Brochures
- Virtuele Showroom
- Droogijsshop

### Leveranciers & Assortiment

Deze pagina toont leveranciers als aanklikbare tegels. Iedere tegel leidt naar een leverancierdetail of direct naar relevante brochurecontent, afhankelijk van de gekozen implementatiefase.

Niet toegestaan:

- individuele leverancier-contactroutes;
- teksten als `bronpagina`, `bronkaart`, `Notion-bron` of `assortimentsbron`;
- een los categorieengedeelte dat geen duidelijke klantwaarde heeft.

Wel toegestaan:

- centrale route naar `nonfood@bidfood.nl`;
- centraal telefoonnummer wanneer bevestigd;
- specialistcontacten wanneer zij Bidfood-specialisten zijn en centraal beheerd worden.

### Brochures

De brochurepagina toont PDF's. Iedere kaart bevat:

- cover;
- titel;
- leverancier;
- categorie;
- jaar indien bekend;
- knop `Bekijk brochure`;
- knop `Vraag productadvies`.

`Bekijk brochure` opent direct de PDF in een nieuw tabblad. Er wordt niet naar Notion doorgelinkt.

### Virtuele Showroom

De virtuele showroompagina heeft de Kuula-tour als centraal element:

```text
https://kuula.co/post/n1/collection/7D1QF
```

De pagina bevat geen gewone rechterkolomfoto als vervanger van de tour. De beste oplossing is een responsive embed met fallbackknop `Open virtuele showroom in nieuw tabblad`.

### Droogijsshop

De droogijsshop gebruikt het Google Form als bestelroute:

```text
https://docs.google.com/forms/d/e/1FAIpQLSe4GTOeR3HwK0_aAytiFc9q5EYi8gwrT3-TRosvbZj3BUp5Uw/viewform
```

Bestellen verloopt via het formulier. E-mail is alleen bedoeld voor vragen.

## Inspiratie

`Inspiratie` bevat alleen `Kennisbank`.

Alle blogs en artikelen openen op dezelfde manier. `Terras & Outdoor` en `Horeca trends` zijn allebei kennisbankartikelen en gebruiken dezelfde artikeltemplate.

Artikelstructuur:

- titel;
- samenvatting;
- hoofdafbeelding;
- publicatiedatum;
- categorie;
- inhoud;
- gerelateerde leveranciers;
- gerelateerde brochures;
- CTA naar productadvies of contact.

## Services

Services bevat ondersteunende diensten:

- Logo's & Personalisatie
- Bibliotheek

### Bibliotheek

De bibliotheek bevat echte PDF's en ondersteunende documenten, met informatie en waar passend foto's. Teksten zoals `Pilot voorbeeld`, `pilotfase` en ontwikkelstatussen horen hier niet thuis.

## Contact

Persoonlijk contact is belangrijk en blijft zichtbaar.

De contactpagina bevat:

- centrale contactgegevens;
- algemene e-mail;
- algemeen telefoonnummer wanneer bevestigd;
- WhatsApp wanneer bevestigd;
- alle relevante Bidfood Non-Food specialisten.

Per specialist:

- naam;
- functie;
- foto;
- e-mailadres;
- telefoonnummer;
- werkgebied of specialisme.

Specialisten worden centraal beheerd, zodat gegevens niet op meerdere plekken handmatig worden bijgewerkt.

## Publieke contentregels

Niet toegestaan op klantgerichte pagina's:

- `Notion`;
- `bronpagina`;
- `bronkaart`;
- `Fase 1`;
- `pilot`;
- `accountteams`;
- technische migratietaal;
- interne projectnotities.

Gebruik klantgerichte taal die past bij Bidfood Non-Food.
