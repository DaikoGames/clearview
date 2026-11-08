# AI Video Radar — Browser-Erweiterung

Lokale YouTube-Erweiterung mit Creator-Listen und gebündeltem Thumbnail-Modell. Keine separate Download-Website. Das Webprojekt bleibt nur als leere Lovable-Vorschau bestehen.

## Automatische Pakete mit GitHub Actions

1. Dieses Projekt in Lovable unter **Project settings → Git** mit GitHub verbinden, falls noch nicht geschehen.
2. Im GitHub-Repository unter **Actions → Build and release browser extensions → Run workflow** einen Testlauf starten. Die fertigen Dateien stehen unter **Artifacts → browser-packages**; das Safari-Projekt unter **safari-xcode-project**.
3. Für eine Veröffentlichung zuerst `version` in `extension/manifest.json` erhöhen. Dann auf GitHub ein Release mit passendem neuen Tag erstellen, z. B. `v4.1.0` für die aktuelle Version. Ein `v*`-Tag startet den Workflow und ergänzt die Release-Dateien. Tag und Manifestversion müssen übereinstimmen.
4. Unter **Releases → Assets** sind die vollständigen ZIP-Dateien herunterladbar. GitHub Actions muss im Repository erlaubt sein; der Release-Job benötigt Schreibrechte für Releases. Bei privaten Repositories sind auch Downloads privat.

Der Workflow installiert die Modell-Werkzeuge, exportiert eine feste Modellversion, bündelt ONNX Runtime/WASM und alle fünf Modellteile, prüft ZIP-Inhalte und veröffentlicht SHA-256-Prüfsummen. Keine Modell-Datei kommt ins Git-Repository. Der erste Lauf ist wegen der Modell-Erstellung langsam. Die Creator-Listen bleiben die versionierten Offline-Snapshots aus `extension/`.

## Veröffentlichung auf den Erweiterungs-Websites

**Der Workflow erstellt Pakete und GitHub-Releases, aber veröffentlicht nicht automatisch in Browser-Stores.** Ein Store-Konto, Angaben zum Datenschutz, Prüfungen und gegebenenfalls Gebühren bzw. Signaturen sind weiterhin erforderlich. Zugangsdaten niemals ins Repository schreiben. Automatisches Store-Hochladen kann später mit GitHub Actions Secrets eingerichtet werden.

| Browser | Datei | Veröffentlichung / Installation |
| --- | --- | --- |
| Chrome | `ai-video-radar-chromium.zip` | Im [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) einreichen. Danach Installation über den Store. Lokal: entpacken → `chrome://extensions` → Entwicklermodus → „Entpackte Erweiterung laden“. |
| Edge | Chromium-ZIP | Separat bei [Microsoft Edge Add-ons](https://partner.microsoft.com/dashboard/microsoftedge/overview) einreichen. |
| Brave, Opera, Vivaldi, Arc und weitere Chromium-Browser | Chromium-ZIP | Entpackte Erweiterung laden; Chrome-Store-Installation nur soweit der Browser sie unterstützt. Opera hat zusätzlich einen eigenen Store. |
| Firefox | `ai-video-radar-firefox.zip` | Bei [Mozilla Add-ons](https://addons.mozilla.org/developers/) einreichen. Erst Mozilla-Signierung erzeugt eine normal installierbare Erweiterung; das ZIP ist nicht signiert. Zum lokalen Test unter `about:debugging` → „Dieser Firefox“ → „Temporäres Add-on laden“ die entpackte `manifest.json` auswählen. |
| Safari auf Mac | `ai-video-radar-safari-xcode.zip` | Automatisch konvertiertes, **unsigniertes Xcode-Projekt**, keine direkt installierbare Erweiterung. Auf einem Mac in Xcode öffnen, eigene Bundle-ID/Apple-Team einstellen, bauen, testen und mit Apple Developer-Konto über den App Store veröffentlichen. `ai-video-radar-safari.zip` ist nur der Konvertierungsinput. |

Die Store-Websites bieten erst nach Freigabe echte Installationsbuttons. Kein Workflow kann Store-Prüfungen umgehen. Firefox/Safari, mobile Browser und andere Browser-Engines sind nicht automatisch kompatibel; die Thumbnail-WASM-Ausführung muss auf den jeweiligen Browsern geprüft werden. Safari-Konvertierungswarnungen stehen im Actions-Protokoll. Es wird **keine** funktionierende Safari-Binärdatei oder allgemeine Unterstützung aller Browser behauptet.

## Datenschutz und Grenzen

Modell und Listen sind lokal gebündelt. Nur YouTube-Thumbnails werden von `i.ytimg.com` geladen; keine Bilder, Videos oder Texte werden an einen Analysedienst hochgeladen. Textchecks lesen nur bereits angezeigten Text bzw. vom Nutzer geöffnete Transkripte. Thumbnail-Ergebnisse sind Hinweise, kein Beweis für KI oder menschliche Urheberschaft. Store-Einreichungen müssen diese Funktionsweise korrekt offenlegen und die Lizenzen der gebündelten Komponenten berücksichtigen.

## Lokal bauen

Voraussetzungen: Linux, Python 3.11, pip, Node.js/npm sowie curl; Bun für Tests.

```sh
bash scripts/build-extension.sh all
node scripts/package-browsers.mjs
python3 scripts/verify-extension.py /tmp/air-release/*.zip
```

Ausgabe in `/tmp/air-release`. Safari-Konvertierung benötigt macOS/Xcode und läuft separat im Workflow. Workflow-Ausführung, Store-Freigaben und Apple-/Mozilla-Signierung müssen auf den jeweiligen Plattformen erfolgen.
