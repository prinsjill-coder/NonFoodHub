# 06 - Rollen, rechten en publicatie

## Doel

Studio ondersteunt meerdere typen gebruikers. Niet iedereen hoeft alles te kunnen aanpassen. Rollen en rechten zorgen voor veiligheid, overzicht en schaalbaarheid.

## Rollen

### Administrator

Heeft volledige toegang.

Kan:

- gebruikers beheren;
- instellingen beheren;
- alle content beheren;
- publiceren;
- archiveren;
- permanent verwijderen;
- rollen aanpassen.

### Contentbeheerder

Beheert dagelijkse inhoud.

Kan:

- leveranciers beheren;
- brochures beheren;
- artikelen beheren;
- bibliotheek beheren;
- homepage beheren;
- media uploaden;
- CTA's beheren;
- publiceren.

Kan niet:

- gebruikers beheren;
- systeeminstellingen wijzigen;
- rechtenstructuur aanpassen.

### Redacteur

Bereidt content voor.

Kan:

- concepten maken;
- artikelen schrijven;
- leveranciersinformatie voorbereiden;
- media uploaden;
- brochures klaarzetten.

Kan niet:

- publiceren;
- verwijderen;
- instellingen aanpassen.

### Viewer

Kan content raadplegen maar niets wijzigen.

## Rechtenmatrix

| Functionaliteit | Admin | Contentbeheerder | Redacteur | Viewer |
| --- | :---: | :---: | :---: | :---: |
| Dashboard | Ja | Ja | Ja | Ja |
| Homepage | Ja | Ja | Lezen | Lezen |
| Leveranciers | Ja | Ja | Bewerken | Lezen |
| Brochures | Ja | Ja | Bewerken | Lezen |
| Kennisbank | Ja | Ja | Bewerken | Lezen |
| Bibliotheek | Ja | Ja | Bewerken | Lezen |
| Showroom | Ja | Ja | Lezen | Lezen |
| Droogijsshop | Ja | Ja | Lezen | Lezen |
| Specialisten | Ja | Ja | Bewerken | Lezen |
| CTA's | Ja | Ja | Lezen | Lezen |
| Media | Ja | Ja | Upload | Lezen |
| Publiceren | Ja | Ja | Nee | Nee |
| Verwijderen | Ja | Nee | Nee | Nee |
| Gebruikers | Ja | Nee | Nee | Nee |
| Instellingen | Ja | Nee | Nee | Nee |

## Publicatieworkflow

```text
Concept
-> Ter controle
-> Goedgekeurd
-> Gepubliceerd
```

Voor de eerste lokale versie kan de reviewstap eenvoudiger zijn, zolang publicatie via GitHub Desktop bewust gebeurt.

## Audit trail

Studio registreert belangrijke acties:

- gebruiker;
- datum;
- tijd;
- actie;
- gewijzigd object;
- oude status;
- nieuwe status.

## Soft delete

Verwijderen archiveert standaard. Permanente verwijdering is alleen voor Administrators.

## Versiebeheer

Voor belangrijke contentobjecten wordt versiehistorie voorzien:

- homepage;
- leveranciers;
- artikelen;
- CTA's;
- contactgegevens.
