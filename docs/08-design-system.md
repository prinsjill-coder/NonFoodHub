# 08 - Design System

## Doel

Het Design System borgt dat NonFoodHub voelt als een professioneel, consistent platform. Nieuwe pagina's en componenten moeten dezelfde visuele taal gebruiken.

## Principes

- Consistentie boven uitzonderingen.
- Hergebruik boven nieuwbouw.
- Rustige, premium uitstraling.
- Goede leesbaarheid.
- Toegankelijkheid als basis.
- Geschikt voor desktop, tablet en mobiel.

## Kleur

De huisstijl gebruikt een Bidfood-geinspireerd blauw palet. Rood is geen primaire accentkleur.

Kleurcategorieen:

- Primary
- Secondary
- Accent
- Background
- Surface
- Border
- Text
- Success
- Warning
- Error

Kleuren worden centraal beheerd als tokens. Geen losse kleurcodes in componenten.

## Typografie

Vaste tekststijlen:

- H1
- H2
- H3
- H4
- Body
- Intro
- Caption
- Button

Lettergroottes worden niet per pagina handmatig aangepast zonder designreden.

## Layout

Basisstructuur:

```text
Header
Hero
Main content
CTA section
Footer
```

Secties hebben consistente marges en maximale breedtes.

## Spacing

Gebruik een vaste schaal:

- XS
- S
- M
- L
- XL
- XXL

Nieuwe componenten gebruiken deze schaal en geen willekeurige afstanden.

## Kaarten

Kaarten worden gebruikt voor:

- leveranciers;
- brochures;
- artikelen;
- downloads;
- specialisten.

Basisonderdelen:

```text
Afbeelding/logo
Titel
Samenvatting
Metadata
CTA
```

## Knoppen

Varianten:

- Primary
- Secondary
- Outline
- Text
- Icon

Iedere knop ondersteunt:

- default;
- hover;
- focus;
- active;
- disabled;
- loading.

## Afbeeldingen

Afbeeldingen krijgen vaste rollen:

| Rol | Richtlijn |
| --- | --- |
| Hero | 1920x960 of 1920x1080 |
| Blog | 1200x675 |
| Brochure | 800x600 of 800x450 |
| Leverancierlogo | object-fit contain |
| Specialistfoto | vierkant of 4:5 |
| Galerie | 1200x1200 |

Afbeeldingen mogen niet vervormen. Logo's mogen niet worden afgesneden.

## Formulieren

Studio-formulieren gebruiken altijd:

- label;
- invoerveld;
- hulptekst waar nodig;
- foutmelding;
- validatie;
- duidelijke primaire actie.

## Empty states

Nooit een leeg scherm. Gebruik begrijpelijke meldingen:

- Geen brochures gevonden.
- Nog geen artikelen gepubliceerd.
- Deze leverancier heeft nog geen brochure.

## Animaties

Animaties zijn subtiel en functioneel. Gebruikers met reduced motion worden gerespecteerd.

## Toegankelijkheid

Iedere component heeft:

- voldoende contrast;
- zichtbare focus;
- semantische HTML;
- alt-tekst waar nodig;
- toetsenbordbediening.
