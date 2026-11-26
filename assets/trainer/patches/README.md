# Bilder für die Patchwand

Neue Einsendungen als **PNG, JPG/JPEG, WebP oder GIF** direkt in diesen Ordner legen.
Der Dateiname dient als Bezeichnung. Transparente PNGs eignen sich besonders gut.
GIMP-Projekte (XCF) zuerst mit ihren sichtbaren Ebenen als PNG exportieren.

Beim nächsten Laden der 3D-Welt liest `api/patches.php` den Ordner neu ein. Die Bilder
werden proportional auf höchstens **512 × 512 Pixel** verkleinert und als PNG unter
`var/patches/` zwischengespeichert. Transparenz bleibt erhalten. Originale werden
nicht verändert; geänderte Originale bekommen automatisch neue Vorschaubilder.
Die Wand ordnet die Bilder ohne weitere Konfiguration an. Unterordner werden nicht gelesen.
Beschädigte Bilder und Dateien über 20 MB bzw. 24 Megapixel werden übersprungen.

Für die Beta: Dateien auf dem Server nach `/beta/assets/trainer/patches/` kopieren.
Dafür ist kein neuer Website-Build notwendig. Lokal diesen Projektordner verwenden;
bei der nächsten Veröffentlichung werden die Bilder mitgenommen.
Der Server benötigt PHP mit GD und Schreibrecht für `var/`.

Die beiden ersten Motive hat der Projektbetreiber bereitgestellt:
Berufsfeuerwehr Wilhelmshaven und THW Ortsverband Jever mit Koordinaten.
