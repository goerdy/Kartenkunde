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

## 3D-Orientierungstrainer (Feature-Branch)

`orientierung.html` ist ein zusätzliches Werkzeug auf Babylon.js 9.37.2, unabhängig vom bestehenden Planzeiger-Simulator. Fiktives Gelände und PQ5-Topo-Karte verwenden denselben lokalen Meter-Datensatz. Grafikbibliothek und CC0-Texturen liegen lokal im Projekt; kein externer Geodienst und keine Positionssensoren sind erforderlich.

Im Worktree `KompassIntegration` mit `npm run build` bauen und mit `PORT=8082 npm run dev` starten: http://127.0.0.1:8082/orientierung.html. Der Haupt-Worktree bleibt auf Port 8081. Browserprüfung: `npm run test:trainer` (Chromium), mit lokaler GPU `KARTENKUNDE_GPU=1 npm run test:trainer`; schnelle Eingabeprüfung ohne GPU-Zeichnung `KARTENKUNDE_FAST=1 npm run test:trainer`. Screenshots und Testprofile werden unter `/tmp` abgelegt.

Bedienung für PC: Klick auf „Gelände betreten“, WASD und Maus, Umschalt für zügiges Gehen. V schaltet echtes Browser-Vollbild ein und aus, auch bei gefangener Maus. Escape beziehungsweise Tab öffnen das Einsatzbuch mit Aufgaben, Ergebnisprüfung, Einstellungen und Hilfen. Die Bewegung stoppt bei Fokusverlust und offenen Menüs. E arbeitet an einem nahen Tisch beziehungsweise legt die Karte dort ab. Im F-Modus gehen W/S und drehen A/D den Körper; mit rechter Maustaste ziehen zum Umschauen. Die gehaltene Karte folgt dem Körper, eine Tischkarte bleibt liegen. Beim Weggehen vom Tisch endet die Nahansicht. F öffnet Kartenarbeit mit freiem Mauszeiger; ohne Karte kann damit ein gehaltenes Instrument betrachtet werden. I öffnet direkt die Instrumentenansicht zum Einstellen des Rings. Rechte Maustaste halten schaut auf die Karte oder hebt einen gehaltenen Kompass zum Peilen an. Sind Karte und Kompass gleichzeitig in der Hand, zeigt Umschalt + rechte Maustaste die Karte. Esc schließt die aktuelle Ansicht; danach aktiviert ein Klick ins Gelände wieder die Maussteuerung. C wechselt den Kompasstyp.

Inventarplätze sind fest: **1 Karte, 2 Kompass (Karten-/Spiegelkompass), 3 Rahmenplanzeiger, 4 Bleistift, 5 Notizblock, 6 Fernglas mit Kompass, 8 Funkgerät, 7 und 9 frei**. Gegenstände bleiben in den Plätzen sichtbar; Hand und Ablage sind markiert. Karte und ein Werkzeug können gleichzeitig gehalten werden. Der Notizblock nimmt den linken Handplatz ein und den Bleistift in die rechte Hand. Der Notizblock wird mit Esc oder der Schließen-Schaltfläche geschlossen; Ziffern bleiben beim Schreiben verfügbar. Notizen sind frei von Hand einzugeben und werden nicht automatisch aus Peilungen ausgefüllt. Ausrüstung auf einer entfernten Ablage kann nicht aus der Ferne zurückgeholt werden.

G legt ein gehaltenes Instrument auf die verfügbare Karte. In der Kartenarbeit: Instrument oder Karte ziehen, R gedrückt halten und ziehen zum Drehen; Ring direkt greifen. Das Mausrad verändert nur den Betrachtungsabstand. Karte und Instrumente haben reale, zueinander passende Größen: Karte 1:25.000, Rahmenplanzeiger 50-mm-Fenster und vorhandene Maßteilungen. Der Bleistift ermöglicht Punkte, Verbindungen, Peilstrahlen, Radieren und Standortmarkierung. Alle Werkzeuge, Menüs und Bedienelemente befinden sich in der Spielansicht, ohne externe Seitenleiste oder Schieberegler.

Freies Üben und fünf Aufgabenarten sind vorhanden. A bleibt bei Karten-Marschzahlaufgaben der Standort zu Aufgabenbeginn; Peilungen und Standortprüfungen beziehen sich auf die aktuelle Position. Für eine Kreuzpeilung müssen die verwendeten Messungen vom gleichen Standort stammen. Eine Prüfung verändert keine Zeichnungen. Hilfen und Lösungen sind explizit zuschaltbar. Einstellungen, Zeichnungen, Inventar und Notizen bleiben lokal im Browser. Alte v1-Sitzungen werden mit übernommenen Zeichnungen und zurückgesetzter Ausrüstung migriert.

Architektur: `trainer-game-state.js` enthält Eingabe-unabhängige Aktionen, feste Inventarplätze und Besitz-/Ablagezustände. Die Babylon-Szene bildet Hand-, Karten- und Tisch-Anheftpunkte in Metern ab. Browser-Eingaben rufen diese Aktionen auf. Dies hält eine spätere XR-Anbindung offen; XR und Tablet-/Smartboard-Steuerung sind noch nicht implementiert. Die Spielerbewegung folgt dem gemeinsamen Höhenmodell, prüft Kollisionen gegen Objekte und verhindert das Betreten tiefer Gewässer und Verlassen des Übungsgebiets. Die Kupplungsbrücke ist zu Fuß und im Auto passierbar.

Vereinfachungen: geografisch Nord und Gitternord stimmen überein; optionale magnetische Abweichung ist im gesamten Gebiet konstant. Keine magnetischen Störfelder, kein Springen, keine reale Navigation. Als Ablagen stehen derzeit Holztische zur Verfügung. Darstellung und Materialien sind stilisiert; Grafikqualität ist im Einsatzbuch umschaltbar. Die Spiegelansicht reflektiert die Kapsel tatsächlich.

Das Fernglas (6) vergrößert achtfach bei gehaltener rechter Maustaste und zeigt die Blickrichtung auf der eingestellten Kompassskala. Die Rastplätze mit Tisch und zwei Bänken stehen abseits der Wege. In der Kartenarbeit drehen die sichtbaren ↻-Griffe die Karte und aufgelegte Instrumente; der Kompassring bleibt unabhängig drehbar.

### Übungswelt Sankt Florian – Rüstholz

Sankt Florian liegt in einer 8 × 8 Kilometer großen Hügellandschaft. Die L 112 führt aus dem geschlossenen Ortskern über die Kupplungsbrücke nach Kupplingen. Die Blaulach durchzieht das Tal der Tränen und nimmt den Strahlbach auf. Im Norden beginnt das dichte Rüstholz; östlich davon liegt jenseits der Blaulach der Führungssumpf, westlich davon die Senke Funkloch. Die Melderwarte auf dem Feldherrenhügel, der Löschteich, Gut Eigenschutz und die Bereitstellungswiese dienen als Orientierungspunkte. Alle genannten Objekte sind Teil desselben Datensatzes für Landschaft und Topo-Karte.

Die Karte zeigt das gesamte 64-km²-Gebiet in 1:50.000 mit Kilometergitter. Lineal und Rahmenplanzeiger sind auf diesen Maßstab kalibriert. Wälder werden in räumlichen Abschnitten mit Entfernungsstufen dargestellt; Baumstämme blockieren das Gehen und Fahren. Städte, Straßen, Gewässer und Brücke haben gemeinsame Grundrisse auf Karte und im Gelände.

Das Übungsauto steht neben der Bereitstellungswiese. **E** steigt in der Nähe ein und nach dem Anhalten wieder aus. **W/S** beschleunigen, bremsen und fahren rückwärts, **A/D** lenken, **Leertaste** bremst. Die Maus schaut unabhängig von der Fahrtrichtung umher. Der Innenraum hat ein analoges Instrumentenbrett mit Geschwindigkeitsmesser, Magnetkompass sowie Längs- und Querneigung. Ein-/Ausstieg, Antrieb, Hindernisprüfung und Geländeneigung liegen in `trainer-vehicle.js`, getrennt von Darstellung und Eingaben. Fahrzeugposition und Belegung werden gespeichert; ein neu geladenes Fahrzeug steht. Menüs und Ausrüstungsansichten halten die Fahrt an. Vereinfachte Fahrkinematik, keine Federungs- oder Unfallsimulation.

Vor dem Start zeigt eine Ladeanzeige den tatsächlichen Aufbau und die Texturbereitschaft. „Gelände betreten“ wird erst nach fertiger Karte, Fahrzeug-Instrumententexturen und Grafikinitialisierung freigegeben. Ladefehler lassen den Start gesperrt und zeigen eine Fehlermeldung.

**9** öffnet das Funkgerät im Spiel. „Fahrzeug anfordern“ versetzt das eine Auto an eine kollisionsfreie Stelle neben dem Spieler. „Navigationsmaterial anfordern“ verstaut Karte und auf dem Tisch abgelegte Werkzeuge wieder im Inventar, ohne Einzeichnungen oder Kompasseinstellungen zu löschen. **9** oder **Esc** schließen den Funk.

Der Einsatzleitwagen hat einen geschlossenen Innenraum, eine rot-blaue Karosserie mit weißer Bauchbinde, Beschriftung „Einsatzleitung“ und Blaulichtbalken. Höchstgeschwindigkeit etwa **120 km/h**. **B** schaltet Blaulicht, **H** das Zweiton-Einsatzhorn. Motor, Rollgeräusch und Einsatzhorn werden lokal per Web Audio synthetisiert; die Audiofreigabe erfolgt erst nach einer Eingabe. Ton lässt sich im Einsatzbuch abschalten. Der Tacho reicht bis 160 km/h. Der Tageskilometerzähler zählt ausschließlich die gefahrene Strecke in beide Fahrtrichtungen, zeigt eine Nachkommastelle in 0,1-km-Schritten, bleibt gespeichert und wird mit **T** zurückgesetzt.

Radio Florian im Einsatzleitwagen wird mit **R** geschaltet (Funkgerät liegt auf Slot **9**).
Die originale Instrumentalschleife unter `assets/trainer/radio/` ist CC0; es werden
keine externen Musikdienste verwendet. Für eingesprochene Wetteransagen Audiodateien
in diesen Ordner legen und `program.json` ergänzen, zum Beispiel
`{"src":"wetterlage.wav","atSeconds":60,"label":"Wetterlage"}` in `announcements`.
Die Sekunden zählen nur bei eingeschaltetem, hörbarem Radio während des Spiels.
Ansagen laufen einmal pro Sitzung und senken die Musik automatisch ab. Ausgeschalteter
Ton oder Pause schaltet alle Geräusche stumm. Alle Programmdateien werden vor dem
Betreten der Welt geladen; nach Änderungen neu bauen und veröffentlichen.

Sankt Florian hat ein gemeinsames Straßen- und Gebäudemodell für 3D-Welt, Stadtplan
im Einsatzbuch (Tab/Esc) und Topokarte. Feuerwehr mit sechs Toren und Schlauchturm,
Polizeiwache, Krankenhaus und THW-Ortsverband tragen eigene Kartensymbole F/P/H/THW.
Die THW-Unterkunft ist eine freie, stilisierte Interpretation des aktuellen
THW-Bauprogramms (Verwaltungsbau, modulare Fahrzeughalle, Photovoltaik, Wärmepumpe),
keine maßgetreue Bauzeichnung: https://bundesbau.de/projekte/das-thw-bauprogramm-eine-loesung-fuer-ganz-deutschland

Das ausgebaute Gelände enthält einen etwa 656 m hohen Meldekopf mit Gipfelkreuz,
Serpentinen und einer Baumgrenze, stärker ausgeprägte Höhenzüge, den terrassierten
Trümmerbruch und acht landwirtschaftliche Flächen. Mischwald, Straßenbäume,
Feldhecken, Heuballen und beschilderte Aussichtsbänke ergänzen die Landschaft.
Die drei Windräder, Ruine Oberlage, Burg Rückhalt, Radarstation Weitblick,
Hof-Wasserhalt-Silos und das alte Pumpwerk sind einzeln auswählbare Peilziele.
Geländehöhen, Waldgrenze, Wege und Peilziele stammen aus denselben Weltdaten wie
die Topokarte; die Höhenlinien decken den gesamten Höhenbereich in 10-m-Stufen ab.


**Funkgerät: Slot 9**, Slot 8 bleibt frei. Im Funkmenü kann zusätzlich ein gelber
Rettungshubschrauber angefordert werden. Er erscheint auf einer freien, ausreichend
ebenen Fläche in der Nähe. **E** steigt am Boden ein und nach der Landung wieder aus.
**Leertaste** steigt, **Strg** sinkt, **W/S** fliegt vorwärts/rückwärts, **A/D** dreht,
**Umschalt + W** beschleunigt bis **300 km/h**. Die Maus bewegt nur den Blick.
Nach Loslassen bremst der Hubschrauber in den Schwebeflug; Menüs pausieren den Flug.
Das Cockpit zeigt Geschwindigkeit, AGL, MSL und Magnetkurs. Rotorgeräusch ist eine
eigene Web-Audio-Synthese. Hindernisse und Wasserlandungen werden berücksichtigt.
`trainer-helicopter.js` enthält die unabhängige Fluglogik,
`trainer-helicopter-view.js` die Darstellung.

Zu Fuß beträgt das Tempo **3,2 m/s**, mit **Umschalt 8 m/s**. **Leertaste springt**
mit Schwerkraft und Kollisionen; Gedrückthalten löst keine wiederholten Sprünge aus.
Im Auto bleibt dieselbe Taste die Bremse, im Hubschrauber der Steigflug.
