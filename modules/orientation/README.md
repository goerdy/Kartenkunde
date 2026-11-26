# Virtuelles Übungsgelände als eigenständiges Modul

Die **Hauptseite ist die Source of Truth**. Allgemeine Kartenregeln, Farben,
Planzeiger-Skalen, Sprache, Branding und rechtliche Angaben werden zuerst dort
geändert. Die Simulation verwendet die kanonischen Quellen über `host.js`.
Es gibt keine von Hand synchronisierten Kopien dieser Definitionen.

## Aufbau und Grenzen

- `src/`: ausschließlich Simulation: Babylon-Szene, Welt, Inventar, Fahrzeuge,
  Aufgaben, Funk, Audio, Bedienung, Modulübersetzungen und `trainer.css`.
- `template.html`: Inhalt des Spielbereichs einschließlich Ladebildschirm.
- `host.js`: einziger JavaScript-Zugang zur Hauptseite. Exportiert Sprache,
  Topo-Farben und Planzeiger-Skalen; registriert die modulspezifischen Texte.
- `standalone.js`: kleiner Host für die separat gehostete Ausgabe.
- `module.json`: explizite Liste aller benötigten Dateien und Ressourcen.
- `assets/trainer/`: ausschließlich Ressourcen dieses Moduls (Texturen, Kenney,
  Piper, vorberechnete Sprache, Radio, Patchbilder). Der etablierte öffentliche
  Pfad bleibt erhalten, insbesondere für neu eingereichte Patchbilder.
- `vendor/babylon.js` und `vendor/babylon-LICENSE.md`: Engine und Lizenz.
- `api/patches.php` und `api/feedback.php`: ausschließlich Modul-Backends.
- `var/patches/` und `var/feedback/`: private Laufzeitdaten, keine Build-Assets.

Die Ressourcen und PHP-Endpunkte bleiben bewusst an ihren bestehenden URLs.
Der eigenständige Export nimmt sie vollständig mit. Eine zweite Karten-App,
MapLibre, Leaflet, PDF-Erzeugung oder ein OSM-Dienst werden für das Spiel nicht
benötigt. Die Hauptseite importiert keinen Simulationscode; nur die
Orientierungsseite bindet den Moduleinstieg ein. Die Navigation hat ihren eigenen
kanonischen Übersetzungsschlüssel `site_trainer` (auch für Seitentitel und Ladebildschirm).
Der Name wird ausschließlich in `src/i18n.js` gepflegt, nicht im Modulkatalog.

## Bauen, prüfen und lokal öffnen

```sh
npm run build                 # gesamte Website -> dist/
npm run build:orientation     # Website prüfen/bauen, Modul -> dist-orientation/
npm run check:dist
npm run check:orientation
PORT=8082 npm run dev
```

Integriert: `http://127.0.0.1:8082/dist/orientierung.html`

Eigenständig: `http://127.0.0.1:8082/dist-orientation/`

`dist-orientation/` kann als **vollständiger Ordnerinhalt** an einer eigenen URL
gehostet werden. Er enthält nur das Modul, seine Ressourcen und die benötigten
Hauptseiten-Grundlagen. `index.html` und `orientierung.html` sind gleichwertige
Einstiege. Es gibt keine Abhängigkeit von einem benachbarten Website-Deployment.
Der Header führt zur Hauptseite; Impressum und Datenschutz verweisen auf die
kanonische Hauptseite. PC, WebGL und Maus/Tastatur bleiben vorausgesetzt.

Für Patchwand und Fehlermeldungen wird PHP mit GD benötigt. Apache muss die
mitgelieferten `.htaccess`-Regeln berücksichtigen; `var/` muss für PHP schreibbar,
aber über HTTP **nicht lesbar** sein. Patchoriginale sind ebenfalls geschützt;
nur die geprüften, serverseitig erzeugten Bilder werden ausgeliefert. Bei anderen
Webservern müssen dieselben Sperren, MIME-Typen und Sicherheitsheader eingerichtet
werden. Ohne PHP fehlen die beiden Serverfunktionen.

Die Modulprüfung erkennt veraltete, fehlende und nachträglich geänderte Dateien.
Der Export enthält Buildkennung sowie Hashes der kanonischen Hauptseitenquellen.
Alle relativen JavaScript-Imports werden auch im Modul mit derselben Buildkennung
versehen. Generierte Dateien in `dist*` werden niemals von Hand bearbeitet.

## Was ist bei Änderungen an der Hauptseite zu tun?

| Änderung der Hauptseite | Kanonische Quelle | Auswirkung / notwendige Modul-Anpassung |
| --- | --- | --- |
| Topo-Farben | `src/map-palette.js` | Automatisch auch auf der Spielkarte. Neu bauen; Lesbarkeit von Spielkarte und Lehrsaal-Postern prüfen. Keine Farbkopie im Modul ändern. |
| Rahmenplanzeiger-Skalenteilung | `src/planzeiger-scale.js` | Automatisch im 2D-Simulator und im 3D-Planzeiger. Neu bauen; beide Maßstäbe und den Nullpunkt unten rechts prüfen. |
| Form, Beschriftung oder Bedienung des 2D-Planzeigers | `src/simulator.js`, `src/simulator-geometry.js`, `src/planzeiger-art.js`, `assets/planzeiger/` | Kein automatischer Grafiktransfer. Bei fachlicher Änderung `modules/orientation/src/trainer-art.js` (`drawRomer`) und das Poster in `trainer-classroom.js` prüfen/anpassen. Die 3D-Instrumente sind Canvas-/Mesh-Zeichnungen, keine Kopien der SVGs. |
| Topo-Symbole, Kartendarstellung oder fachliche Kartenregeln | `src/pq5-tk.js`, `src/tk-symbols.js`, weitere Kartenmodule | Farben sind geteilt, Symbole und Geländekarte nicht. `trainer-art.js` (`drawMap`, `drawTownPlan`) und Lehrmittel in `trainer-classroom.js` prüfen. |
| Sprachdienst oder allgemeine Begriffe | `src/i18n.js` | Dienst und allgemeine Schlüssel werden direkt verwendet. Modulspezifische Texte in `modules/orientation/src/trainer-messages.js` bei fachlichen Änderungen nachziehen. Vorhandene Hauptseiten-Schlüssel haben Vorrang. |
| Logo, Favicon, Schriftarten | `assets/brand/`, `assets/fonts/` | Automatisch beim neuen Export übernommen. Im Spiel fest gezeichnete Schilder/Lehrmittel und den eigenständigen Header bei zusätzlichem Brandingwechsel prüfen. |
| Allgemeine Gestaltung | `assets/css/site.css`, `src/style.css`, `src/site.css` | Wird automatisch übernommen. Ladebildschirm, Menüs, Funkgerät und Schriftgrößen prüfen; nötige Spielanpassungen ausschließlich in `modules/orientation/src/trainer.css`. |
| Navigation oder Website-Shell | `tools/site.mjs`, `templates/app.html`, `templates/brand.html`, `src/site.js` | Integrierter Host übernimmt Änderungen automatisch. Logo, Schriftzug und Beta-Kennzeichnung stammen auch eigenständig aus `templates/brand.html`. Weitere Header-/Footer-Änderungen im Generator `tools/build-orientation.mjs` bei Bedarf nachziehen. Das Spiel selbst benötigt `site.js` nicht. |
| Impressum / Datenschutz | Hauptseiten-Inhalte und `tools/site.mjs` | Export verlinkt auf die Hauptseite. Falls die Datenerhebung der Simulation geändert wird, zusätzlich Datenschutzhinweis im Funkgerät/Feedbackformular und `api/feedback.php` prüfen. |
| Koordinatenregeln, UTMREF-Darstellung | Kartenwerkzeuge, insbesondere `src/geo.js`, `src/coordinates.js` | Fiktive Spielwelt hat eigene Koordinatenlogik in `trainer-grid.js` und Lehrtexte in `trainer-campaign.js`. Bei fachlichen Änderungen bewusst angleichen; keine realen Ortskoordinaten für das fiktive Gelände übernehmen. |
| Sicherheitsheader / Hosting | `.htaccess` | Wird aus dem Hauptseiten-Build übernommen. PHP-Endpunkte, private Ordner, Piper-Worker/WASM, Audio und WebGL prüfen; Export nicht ohne seine Schutzdateien ausliefern. |
| Neue gemeinsame Ressource oder API | zunächst Hauptseitenquelle | Vertrag in `host.js` und Dateiliste in `module.json` erweitern; Export und Abhängigkeitstests aktualisieren. Keine direkten Imports aus beliebigen Hauptseitenmodulen. |

Bei geändertem Lerninhalt außerdem die betroffenen vorberechneten gesprochenen
Texte mit `tools/render-trainer-speech.py` neu erzeugen. Der Katalog steht in
`tools/trainer-speech-catalog.mjs`; Modelle unter `assets/trainer/piper/`.
Die 3D-Welt übernimmt keine Änderungen an der Lehrunterlage automatisch.

## Arbeiten mit main und künftigen Feature-Branches

Das virtuelle Übungsgelände ist Bestandteil von `main`. Größere neue Features
können weiterhin in eigenen Branches und Worktrees entwickelt werden.
Änderungen an den gemeinsamen Grundlagen zuerst in `main` vornehmen. Danach
`main` bei Bedarf in den jeweiligen Feature-Branch übernehmen und den Export neu bauen/testen.
Nicht die Hauptseite aus einem älteren 3D-Export zurückkopieren. Der normale
Hauptseiten-Deploy aktualisiert einen separat gehosteten 3D-Export nicht:
Dieser muss danach eigens neu gebaut und vollständig deployed werden.
Serverseitige Rückmeldungen und Patch-Caches niemals mit Build-Dateien ersetzen.
Lokale Neubauten erhalten vorhandene `var/`-Ordner; die Integritätsprüfung
berücksichtigt nur ausgelieferte Dateien und ignoriert diese privaten Laufzeitdaten.

## Prüfungen

`npm test` prüft auch die Modulgrenzen und die kanonischen Definitionen.
`npm run test:trainer` prüft den integrierten Spielablauf. Derselbe Browsertest
kann mit `KARTENKUNDE_DIST=dist-orientation/` gegen den separaten Export laufen.
`npm run test:simulator` prüft weiterhin den unabhängig gebliebenen 2D-Simulator.
