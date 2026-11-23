Weiterleitung von pq5.de zu kartenkunde.app

Die Dateien .htaccess, index.html und redirect.js aus diesem Paket in den ALTEN
Webspace-Ordner /pq5/UTMREF-MAP/ auf pq5.de hochladen und die dort vorhandenen
Dateien gleichen Namens ersetzen. Versteckte Dateien beim Upload anzeigen,
damit .htaccess mit übertragen wird.

Nicht in den Webspace von kartenkunde.app hochladen.

.htaccess: dauerhafte HTTP-Weiterleitung (301), auch für Unterseiten und
Dateipfade. index.html wird auf die neue Startseite geleitet. Query-Parameter
und URL-Fragmente, etwa #uebung=..., bleiben bei der HTTP-Weiterleitung erhalten.

index.html und redirect.js: zusätzliche HTML-Weiterleitung für Hosts ohne Rewrite-Unterstützung.
Mit JavaScript bleiben Parameter und URL-Fragment erhalten. Ohne JavaScript
führt eine Meta-Weiterleitung nach zwei Sekunden zur neuen Startseite.

Beispiele:
https://pq5.de/pq5/UTMREF-MAP/ -> https://kartenkunde.app/
https://pq5.de/pq5/UTMREF-MAP/index.html -> https://kartenkunde.app/
https://pq5.de/pq5/UTMREF-MAP/karten.html -> https://kartenkunde.app/karten.html
https://pq5.de/pq5/UTMREF-MAP/?lang=de#uebung=... -> gleicher Zusatz am neuen Ziel

Das Paket ist vorbereitet, aber noch nicht auf pq5.de hochgeladen.
