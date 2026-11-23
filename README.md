# KARTENKUNDE.app

Kostenlose, werbefreie Werkzeuge für Kartenkunde in Einsatz und Ausbildung im Bevölkerungsschutz. Organisationsübergreifend für Feuerwehr, THW, DLRG, Rotes Kreuz und weitere Hilfsorganisationen.

**Website:** https://kartenkunde.app · **Repository:** https://github.com/goerdy/Kartenkunde

## Funktionen

- Mehrseitige, maßstabsgetreue PDF-Karten mit UTMREF/MGRS-Gitter, optionalen UTM- und Gradangaben, Übersicht, Legende und Druckmaßstab.
- Gebietsauswahl durch ein Rechteck oder Verwaltungsgrenzen; Deutschland bis zur Gemeinde.
- Kartenstile auf Basis von OpenStreetMap/OpenFreeMap, basemap.de und LGLN DTK50 (nur Niedersachsen), mit zusätzlichen Kartenobjekten und Höhenlinien je nach Stil.
- Maßstäbe 1:5.000 bis 1:200.000, Papierformate A4 bis A1, Hoch-/Querformat und bis zu 300 dpi.
- Übungsbögen mit bis zu 20 Aufgaben, Anleitung, Lösungen und Wiederlade-Link/QR-Code als ZIP. Übungen und Einstellungen stecken im Link, nicht in einer serverseitigen Übungsdatenbank.
- Planzeiger-Simulator für Maus, Touch, Beamer und Smartboard, mit Vollbild und Maßstäben 1:25.000/1:50.000.
- Lehrmaterial, Technikübersicht und manuell startbarer Datenquellentest; Deutsch, Englisch und Französisch.

Von Philipp „goerdy“ Gürth.

## Lokal entwickeln

Voraussetzung: aktuelles Node.js mit npm. Die Browserbibliotheken sind unter `vendor/` enthalten; `npm install` ist nicht erforderlich.

```sh
npm run build
npm run dev
```

Danach http://127.0.0.1:8081 öffnen. Alternativ erzeugt `npm run build` auch `Start.html`, das die Kartenwerkzeuge als einzelne HTML-Datei enthält. Online-Kartendaten benötigen weiterhin Internet. `./start.sh` startet den lokalen Server und öffnet Firefox; vorher einmal bauen.

Nach Änderungen an Templates oder Seitentexten erneut `npm run build` ausführen. Die erzeugten HTML-Seiten im Projektstamm, `Start.html` und `dist/` werden bewusst nicht mit Git versioniert.

## Build und Prüfungen

```sh
npm run build
npm run check:dist
npm test
```

`check:dist` prüft den Build gegen Quell- und Ausgabedateien sowie den Git-Stand. Die Technikseite zeigt den kurzen Commit-Hash als Anwendungsversion mit einem Link zum vollständigen Commit. Builds mit noch nicht eingecheckten Änderungen werden ausdrücklich gekennzeichnet. Ohne Git-Metadaten bleibt der Build möglich; als Kennung steht weiterhin der Build-Fingerabdruck zur Verfügung. Für eine Veröffentlichung erst committen, dann neu bauen. Die Unit-Tests prüfen unter anderem Projektionen, Blattaufteilung, Koordinaten, PDF-Inhalte, Kartengestaltung, Übersetzungen und Sicherheitsgrenzen.

Für die zusätzlichen Browserprüfungen werden Chromium und ein laufender lokaler Server benötigt:

```sh
npm run test:exercise
npm run test:simulator
```

Die Browserprüfungen fragen echte externe Datendienste ab und benötigen Internet. Screenshots und Testdownloads werden im temporären Verzeichnis abgelegt.

Bibliotheken aktualisieren bzw. ihre Integrität prüfen:

```sh
npm run vendor
npm run audit:vendor
npm run build
```

Versionen und SHA-384-Werte sind in `src/libraries.js` festgelegt. `audit:vendor` fragt aktuelle npm-Sicherheitsmeldungen ab; Versionsänderungen müssen zusätzlich getestet werden.

## Veröffentlichung

Den **Inhalt von `dist/`** direkt in das Dokumentenverzeichnis des Webservers kopieren, einschließlich `.htaccess`. Ein zusätzliches `dist`-Unterverzeichnis ist nicht nötig. Benötigt werden HTTPS und für den POI-Proxy PHP mit ausgehenden HTTPS-Verbindungen. Apache muss die `.htaccess`-Regeln für Zugriffsschutz und Sicherheitsheader anwenden können.

PDFs entstehen im Browser; eine Datenbank oder ein serverseitiger PDF-Renderer ist nicht erforderlich. `api/farms.php` fragt fest vorgegebene OSM-Dienste ab, puffert öffentliche Antworten und begrenzt Anfragen. Ohne funktionierenden Proxy sind direkte Browserabfragen als Ausweichweg vorgesehen.

**Keine Zugangsdaten gehören ins Repository.** FTP-/FTPS-Konfiguration, Passwörter und Deployment-Helfer werden außerhalb des Projekts verwaltet. Dieses Repository enthält weder produktive Zugangsdaten noch ein an ein Hostingkonto gebundenes Uploadskript. `.gitignore` schließt zusätzlich typische geheime Konfigurationen aus.

Unter `integration/legacy-redirect/` liegt eine separate Weiterleitung für den früheren Projektpfad. Diese Dateien gehören ausschließlich auf den alten Webspace, nicht in den Webspace der neuen Domain.

## Verzeichnisstruktur

- `src/`: Karten-, PDF-, Übungs- und Simulatorlogik, Übersetzungen und Gestaltung.
- `templates/`: Vorlagen der Website und ihrer Inhaltsseiten.
- `assets/`: lokale Schriften, Weltübersicht, Planzeiger, Präsentation und Bilder.
- `vendor/`: fest versionierte Browserbibliotheken.
- `api/`: begrenzter PHP-Datendienst für zusätzliche Kartenobjekte.
- `tools/`: Seitengenerator, Build, lokaler Server und Browserprüfungen.
- `tests/`: aktuelle automatisierte Tests und Referenzdaten.
- `dist/`: lokal erzeugte Veröffentlichung; nicht im Repository.

## Daten, Datenschutz und Druck

Karten und Verwaltungsgrenzen werden von externen Diensten geladen. Dabei fallen Verbindungsdaten und angefragte Kartenausschnitte an. Die Anwendung erstellt PDFs und Übungen lokal, speichert Einstellungen und Entwürfe im Browser und verwendet einen serverseitigen POI-Cache mit Missbrauchsbegrenzung. Sie ist deshalb keine vollständig offline arbeitende Anwendung. Die Diensteliste und Datenschutzhinweise stehen auf der Website unter Technik bzw. Impressum/Datenschutz. Hosting-, Kontakt- und Rechtstexte müssen bei einer eigenen Veröffentlichung an den tatsächlichen Betreiber angepasst werden.

Für maßhaltige Ausdrucke **100 % / tatsächliche Größe** einstellen und den Kontrollmaßstab prüfen. Die Karten basieren auf verfügbaren Geodaten und ersetzen keine Prüfung der örtlichen Lage. UTM wird von 80° Süd bis 84° Nord unterstützt; Kartenausschnitte über die Datumsgrenze werden nicht unterstützt.

Die enthaltenen Bibliotheken, Schriftarten und Geodaten unterliegen ihren jeweiligen Lizenzen. Siehe [THIRD_PARTY.md](THIRD_PARTY.md). Die öffentliche Bereitstellung dieses Repositorys ist keine pauschale Lizenzierung aller enthaltenen Inhalte unter derselben Lizenz.
