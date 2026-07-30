# Studio QA-checklist

Deze checklist is bedoeld als vaste handmatige controle na iedere Studio-sprint.
Gebruik hem voordat wijzigingen via GitHub Desktop worden gecommit en gepusht.

## Lokale preview starten

Open Terminal en ga naar de projectmap:

```bash
cd "/Users/jillprins/Documents/Codex/Active Projects/NonFoodHub"
```

Start daarna de lokale server:

```bash
python3 -I -m http.server 8080
```

Open vervolgens:

```text
http://localhost:8080/studio/
```

Laat Terminal open zolang je test. Stop de server na afloop met `Control+C`.

## Automatische checks

Voer na een Studio-wijziging deze lokale check uit:

```bash
node scripts/check-studio.mjs
```

De check moet eindigen met:

```text
Studio checks voltooid.
```

Als de check faalt, los dan eerst de melding op voordat je verder test.

## Chrome Console openen

Open de Console in Chrome met:

```text
Option + Command + J
```

Tijdens het testen mogen er geen rode foutmeldingen verschijnen.

## Vaste checklist na iedere sprint

- Open het Studio-dashboard.
- Controleer de route die in de sprint is gewijzigd.
- Voer de belangrijkste actie van de gewijzigde functionaliteit uit.
- Controleer of annuleren werkt zonder ongewenste wijziging.
- Controleer dialogs met muis en toetsenbord.
- Gebruik `Tab` om door knoppen, links en velden te lopen.
- Gebruik `Shift+Tab` om terug te navigeren.
- Gebruik `Escape` om dialogs te sluiten waar dat hoort.
- Open een onbekende route, bijvoorbeeld `#/bestaat-niet`.
- Gebruik de browserknop terug.
- Controleer of de documenttitel past bij de geopende Studio-pagina.
- Controleer de Chrome Console op fouten.
- Test de pagina op normale zoom: 100%.
- Controleer kort de publieke website, zodat Studio-wijzigingen daar niets onverwachts hebben veranderd.
- Commit en push pas via GitHub Desktop nadat de lokale controle goed is.

## Sprint 4B import/export checklist

- Importeer een geldig `suppliers.json`-bestand.
- Controleer dat de import als nieuwe sessiebron wordt getoond.
- Controleer dat import niets publiceert en niets naar de repository schrijft.
- Importeer een bestand met ongeldige JSON.
- Controleer dat het validatierapport focus krijgt na een fout.
- Importeer een bestand groter dan 1 MB.
- Controleer dat er een duidelijke melding verschijnt en de sessie niet wijzigt.
- Importeer een bestand met dubbele `id`.
- Importeer een bestand met dubbele slug.
- Importeer een bestand met onbekende velden.
- Controleer dat onbekende velden waarschuwingen geven en import niet blokkeren.
- Exporteer de actieve sessie.
- Controleer dat het bestand exact `suppliers.json` heet.
- Controleer dat de exportmelding zegt dat het bestand alleen is gedownload.
- Controleer dat de melding vraagt om `data/suppliers.json` handmatig te vervangen.
- Controleer dat GitHub Desktop daarna gebruikt moet worden voor commit en push.
- Importeer opnieuw hetzelfde bestand.
- Klik snel meerdere keren op Export en controleer dat er geen dubbele exportactie ontstaat.

## Sprint 5 gedeelde helpers checklist

- Controleer dat statuslabels in lijst, tabel, detail en formulier gelijk zijn gebleven.
- Controleer een formulier met validatiefouten en gebruik de foutlinks.
- Controleer dat het eerste ongeldige veld focus krijgt.
- Controleer een onbekende algemene route, bijvoorbeeld `#/bestaat-niet`.
- Controleer een ontbrekende leverancier, bijvoorbeeld `#/leveranciers/bestaat-niet`.
- Controleer dat import/export nog dezelfde meldingen en bestandsnaam gebruiken.
- Controleer dat leveranciersbeheer nog steeds visueel gelijk aan Sprint 4B oogt.

## Na publicatie

Na commit en push via GitHub Desktop:

- Wacht tot GitHub Pages de wijziging heeft verwerkt.
- Controleer de live Studio-route of publieke pagina die door de sprint geraakt had kunnen worden.
- Controleer nogmaals kort de Console op fouten.
