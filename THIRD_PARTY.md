# Bibliotheken und Kartendaten

Die Anwendung verwendet fest versionierte Browserbibliotheken. `npm run vendor` lädt alle Bibliotheken in `vendor/`; fehlen Dateien, lädt der Browser sie von jsDelivr. Lokale Dateien werden bevorzugt; SHA-384-Integritätswerte schützen lokale HTTP-Dateien und den CDN-Ersatz. Keine API-Schlüssel und keine npm-Pakete sind zum Betrieb erforderlich.

- Leaflet 1.9.4: BSD-2-Clause, https://leafletjs.com/ und https://github.com/Leaflet/Leaflet/blob/v1.9.4/LICENSE
- MapLibre GL JS 5.24.1: BSD-3-Clause, https://github.com/maplibre/maplibre-gl-js/blob/v5.24.1/LICENSE.txt
- proj4js 2.19.0: MIT, https://github.com/proj4js/proj4js
- mgrs 2.1.0 / vorhandene kompatible UMD-Ausgabe: MIT, https://github.com/proj4js/mgrs
- jsPDF 4.2.1: MIT, https://github.com/parallax/jsPDF

Die Copyright- und Lizenzhinweise in Bibliotheksdateien bleiben erhalten. Die beigefügten Bibliotheken wurden mit `npm run vendor` von den festgelegten Versionsadressen geladen. Für einen einheitlichen Versionsstand `npm run vendor` ausführen.

## Onlinequellen

- OpenFreeMap: https://openfreemap.org/quick_start/ – Styles Liberty, Bright und Positron; OpenMapTiles / OpenStreetMap-Daten.
- OSM-Daten: © OpenStreetMap-Mitwirkende, ODbL, https://www.openstreetmap.org/copyright
- OpenMapTiles: https://openmaptiles.org/ – Lizenz-/Attributionshinweise der jeweiligen Styles beachten.
- Relief: AWS Terrain Tiles / Mapzen, https://registry.opendata.aws/terrain-tiles/ und https://github.com/tilezen/joerd/blob/master/docs/attribution.md . Enthält u.a. SRTM, GMTED und 3DEP; Quellen sind regional verschieden.

Quellenangaben erscheinen auf der Webkarte und auf jedem PDF-Blatt. PDF-Karten sind abgeleitete Darstellungen; die zugrunde liegenden Daten bleiben unter ihren jeweiligen Lizenzen.

Der öffentliche Standard-Kachelserver von OpenStreetMap wird nicht als PDF-Quelle verwendet: https://operations.osmfoundation.org/policies/tiles/ . Top-O-Map ist ebenfalls nicht als kostenlose PDF-Quelle eingebaut, da Downloads nach den Anbieterbedingungen ein Kontingent erfordern: https://top-o-map.de/agb.html .

## Verwaltungsgrenzen

Deutschland primär: BKG VG250 WFS https://sgx.geodatenzentrum.de/wfs_vg250 . Staat, Länder, Kreise und Gemeinden, per AGS zugeordnet. © BKG (Jahr des Datenbezugs), dl-de/by-2-0: https://www.govdata.de/dl-de/by-2-0 . Datenquellen: https://sgx.geodatenzentrum.de/web_public/gdz/datenquellen/datenquellen_vg_nuts.pdf . Die Geometrien werden für Auswahl, Blattabdeckung und Darstellung zusammengeführt. Das WFS-GeoJSON weist keinen einheitlichen Datensatzstand aus; Abrufzeitpunkt und Aktualität der Grenzdaten sind zu unterscheiden. geoBoundaries dient für Deutschland als automatische Ersatzquelle und bleibt für alle anderen Länder zuständig.

geoBoundaries gbOpen: https://www.geoboundaries.org/api.html . Länderliste und verfügbare Ebenen werden über die öffentliche API geladen, vereinfachte GeoJSON-Grenzen über die vom Anbieter zurückgegebenen Downloadlinks. Git-LFS-Dateien werden über GitHubs Medienendpunkt geladen, reguläre Dateien alternativ über den Raw-Endpunkt. Die Originalquelle, Lizenz und das repräsentierte Jahr werden aus den Metadaten übernommen und auf der PDF-Titelseite angegeben. Die genauen Lizenzen können je Land variieren. Deutschland: Bundesamt für Kartographie und Geodäsie / Federal Agency for Cartography and Geodesy, Datenlizenz Deutschland – Namensnennung 2.0; der in der API aktuell ausgewiesene Stand ist 2021. Die UI zeigt die Herkunft als Tooltip am ausgewählten Gebiet und verweist auf geoBoundaries.

## Gestaltung und Schriften

Gemeinsames Linktree-CSS aus `../assets/css/site.css`, mit einer lokalen Fallback-Kopie. Inter Tight: SIL Open Font License, siehe `assets/fonts/OFL-Inter-Tight.txt`. Die Schriften werden lokal ausgeliefert.

## Equal-Earth-Weltübersicht

Natural Earth, Länderflächen 1:110 Mio.: Public Domain, https://www.naturalearthdata.com/about/terms-of-use/ . GeoJSON: https://github.com/nvkelso/natural-earth-vector . Nur für die Auswahlübersicht bei Zoom 2–4; keine PDF-Kartenquelle.

Anregung für die Umschaltung: https://equal.bbox.earth/leaflet-eq2merc/ . Die Projektionsberechnung ist eine eigene Implementierung von Equal Earth auf dem WGS84-Referenzellipsoid (EPSG:8857).

## Amtliche LGLN-DTK50

Dienst: https://opendata.lgln.niedersachsen.de/doorman/noauth/dtk50_wms?SERVICE=WMS&REQUEST=GetCapabilities . Layer `ni_dtk50_farbe` und `ni_dtk50_grau`. Niedersachsen; außerhalb der Datenabdeckung keine weltweite Ersatzkarte.

Lizenz: Creative Commons Namensnennung 4.0 International, https://creativecommons.org/licenses/by/4.0/ . LGLN-AGNB Abschnitt 7: https://www.lgln.niedersachsen.de/startseite/wir_uber_uns_amp_organisation/logo/allgemeine-geschafts-und-nutzungsbedingungen-agnb-97401.html . Quellenvermerk in der Webansicht und auf jedem PDF-Blatt: © GeoBasis-DE/LGLN, Jahr des aktuellen Datenbezugs, CC BY 4.0; Daten geändert durch Ausschnitt, Projektion und UTMREF-Gitter. Das Bezugsjahr wird beim Rendern aus dem aktuellen Datum bestimmt. Lizenzlink im PDF anklickbar. Kein OSM-Quellenvermerk für reine LGLN-Karten.

Am 13.11.2026 geprüft: öffentlicher Abruf ohne Anmeldung, CORS `Access-Control-Allow-Origin: *`, WMS 1.3.0, EPSG:3857 und EPSG:32632/32633, maximal 15000 × 15000 Pixel laut GetCapabilities. Ein Kartenbild in EPSG:32632 wurde erfolgreich abgerufen. Diensteigenschaften und Verfügbarkeit können sich ändern.

## PQ5-TK

Eigene MapLibre-Stildefinition in `src/pq5-tk.js`. Daten: OpenStreetMap / OpenMapTiles über OpenFreeMap, https://openfreemap.org/quick_start/ . Glyphen: Noto Sans über den OpenFreeMap-Glyphendienst. Die Farbgebung und Liniengestaltung orientieren sich an deutschen topografischen Karten; es werden keine LGLN-Kartenbilder, Logos oder Originalsignaturen verwendet. PQ5-TK ist keine amtliche LGLN-Karte. Die verwendeten OpenMapTiles-Vektordaten enthalten keine Höhenlinien; Gipfelhöhen werden dargestellt, soweit vorhanden.

## OSM-Zusatzdaten und eigene Symbole

Quelle: Geofabrik Postpass, https://postpass.geofabrik.de/ , API https://postpass.geofabrik.de/api/interpreter ; Ausweichdienst https://overpass-api.de/api/interpreter . OSM-Daten unter ODbL, gleicher OSM-Quellenvermerk wie für die Grundkarte. Die Geofabrik-Nutzungsbedingungen verlangen verantwortliche, serielle Anfragen, Cache und eine identifizierbare Anwendung. Keine Massenextraktionen oder automatischen Crawler. Für eine populäre Website einen eigenen oder bezahlten Dienst betreiben. Die Live-Prüfung ist eine ausdrücklich ausgelöste Entwicklungsprüfung für einzelne Ausschnitte, kein automatischer CI-Lauf.

Abruf: fester räumlich begrenzter Tagfilter für Höfe, öffentliche Orientierungspunkte, Stromleitungen und in OSM erfasste Militärflächen. Browser bevorzugt den eigenen Endpunkt `api/farms.php`; Node und PHP verwenden denselben festen Kategorienkatalog in `api/tk-filters.json`. Es werden keine beliebigen fremden URLs oder frei übergebenen Abfragen akzeptiert. Daten bleiben ohne Verfügbarkeitsgarantie.

Die Orientierungssymbole und das Schraffurmuster sind eigene, lokal erzeugte Grafiken; keine LGLN-Signaturen. Die PDF-Legende verwendet dieselben Symbolpfade wie die Kartendarstellung. `power=line`/`minor_line` bleiben Linien; Militärflächen bleiben Polygone mit ihren Innenringen.

## QR-Code

qrcode-generator 2.0.4 von Kazuhiko Arase, MIT-Lizenz, https://github.com/kazuhikoarase/qrcode-generator . Lokal unter `vendor/qrcode.js`, Lizenzhinweis im Dateikopf. QR-Erzeugung vollständig lokal, keine Übertragung von Kartendaten an einen QR-Dienst.

## basemap.de Web Vektor

Öffentlicher Dienst: https://sgx.geodatenzentrum.de/gdz_basemapde_vektor/tiles/v2/bm_web_de_3857/bm_web_de_3857.json . Dokumentation: https://basemap.de/produkte-und-dienste/web-vektor/ . Datenmodell V2: https://basemap.de/data/produkte/web_vektor/meta/bm_web_vektor_datenmodell.html . Nutzungsbedingungen: https://sgx.geodatenzentrum.de/web_public/gdz/lizenz/deu/nutzungsbedingungen_basemapde.pdf .

Die Daten stehen kostenfrei unter CC BY 4.0. Sichtbarer Quellenvermerk © GeoBasis-DE / BKG (Jahr des letzten Datenbezugs) CC BY 4.0 sowie Veränderungshinweis im Web und PDF; Weblinks auf BKG und CC BY 4.0. Der PQ5-Stil ist eine eigene Definition für das veröffentlichte Datenmodell, keine Kopie der amtlichen Stildatei. Noto-Schriften weiterhin über OpenFreeMap; zusätzliche Hofnamen und Orientierungspunkte aus OSM unter ODbL. basemap.de deckt Deutschland ab.

PQ5-Default-GER nutzt zusätzlich die OpenMapTiles-Verkehrsebene aus OpenFreeMap für Betriebs- und Zufahrtswege (`class=service`). Daten unter ODbL, OSM-/OpenFreeMap-Vermerk im Web und PDF. Die amtlichen Grunddaten werden nicht überschrieben.

Höhenlinien: zusätzliches amtliches basemap.de-Archiv https://sgx.geodatenzentrum.de/gdz_basemapde_vektor/tiles/v2/bm_web_hl_de_3857/bm_web_hl_de_3857.json . CC BY 4.0, derselbe GeoBasis-DE/BKG-Vermerk und Veränderungshinweis wie bei der Grundkarte. Metadaten geprüft am 21.11.2026: MVT, Ebene `Hoehenlinie`, Attribute `hoehe`, `klasse`, `hangneigung`, `land`, Zoom 8–15. Die PQ5-Darstellung ist eine eigene Definition, keine Kopie des amtlichen Relief-Stils; keine zusätzliche Schummerung wird aktiviert.

## World Magnetic Model / geomagnetism

WMM2025 coefficients: NOAA NCEI / British Geological Survey (2024), https://doi.org/10.25921/aqfd-sd83. U.S. Government WMM material is public domain and not subject to copyright protection. Model valid 2025–2029; values computed at zero ellipsoidal height.

Offline calculation code: Natural Atlas, Inc. & Contributors, geomagnetism (Apache-2.0), commit `5cf5cba40d8cadf4220734296bbfe4a7f4351be6`: https://github.com/naturalatlas/geomagnetism. Full license: `vendor/geomagnetism-LICENSE.txt`. Bundled into `src/geomagnetism.js` with calendar-year length corrected for leap years and model validity dates aligned to epoch 2025–2030. Only the WMM2025 dataset is shipped. Reference tests derived from the upstream WMM2025 reference values.

Sicherheitsstand: jsPDF 4.2.1 enthält die bis März 2026 veröffentlichten Sicherheitskorrekturen. MapLibre 5.24.1 ist der vom Hersteller ausgewiesene korrigierte 5.x-Rückport für GHSA-jrc7-96c5-q579 (https://github.com/maplibre/maplibre-gl-js/security/advisories/GHSA-jrc7-96c5-q579). Der aktuelle npm-Bereich `<=6.4.0` klassifiziert diesen Rückport zu pauschal; `tools/audit-vendor.mjs` weist ausschließlich diese konkret geprüfte Kombination gesondert aus.

## Lokal hinterlegte Grenzen für Abdeckungshinweise

`src/coverage-boundaries.js`: Deutschland und Niedersachsen, © Bundesamt für Kartographie und Geodäsie, Datenlizenz Deutschland – Namensnennung 2.0 (https://www.govdata.de/dl-de/by-2-0), Datenstand 2021. Bezug über geoBoundaries gbOpen, DEU ADM0/ADM1, Revision `9469f09`: https://www.geoboundaries.org/api/current/gbOpen/DEU/ADM0/ und https://www.geoboundaries.org/api/current/gbOpen/DEU/ADM1/ . Änderungen: Auswahl der Gebiete, Vereinfachung (0,001 Grad) und Rundung. Dient der näherungsweisen Anzeige der regionalen Abdeckung, nicht als exakte Kachel-Verfügbarkeitsgrenze.
