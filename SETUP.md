# Indoor Navigation - Setup & Testing Guide

## Zusammenfassung

Indoor-Navigations-App für den 3. Stock der Schule mit:
- QR-Code-Scan für Positions-Reset
- Pedestrian Dead Reckoning (Schritterkennung + Kompass)
- Dijkstra-Routing zwischen Räumen
- AR-Pfeil zeigt Richtung zum Ziel
- Debug-Overlay zum Testen

## Entwicklung starten

```bash
npm install
npm run dev
```

Der Dev-Server startet mit HTTPS auf allen Netzwerk-Interfaces.

## Auf dem Smartphone testen

### 1. Server starten

```bash
npm run dev
```

Der Server zeigt dir die URLs an, z. B.:
```
➜  Local:   https://localhost:5173/
➜  Network: https://10.0.0.244:5173/
```

### 2. Smartphone mit gleichem WLAN verbinden

Stelle sicher, dass dein Smartphone im **gleichen WLAN** ist wie dein Computer.

### 3. URL am Smartphone öffnen

Öffne die **Network**-URL (z. B. `https://10.0.0.244:5173/`) in deinem Smartphone-Browser.

**Wichtig:** Nutze die IP-Adresse aus deinem lokalen Netz (z. B. `10.0.0.x` oder `192.168.x.x`), NICHT `localhost`!

### 4. Zertifikatswarnung akzeptieren

Da der Server ein selbst-signiertes Zertifikat nutzt, erscheint eine Warnung:

**iOS Safari:**
1. Tippe auf "Details anzeigen" / "Show Details"
2. Tippe auf "Diese Website besuchen" / "Visit this Website"
3. Bestätige nochmals mit "Besuchen" / "Visit Website"

**Android Chrome:**
1. Tippe auf "Erweitert" / "Advanced"
2. Tippe auf "Weiter zu <IP> (unsicher)" / "Proceed to <IP> (unsafe)"

**Hinweis:** Dies ist nur beim ersten Mal nötig. Das Zertifikat ist sicher für lokale Tests.

### 5. App nutzen

1. **"Sensoren aktivieren"** antippen
   - iOS: Erlaubt Bewegungssensoren & Kompass
   - Android: Erlaubt automatisch

2. **QR-Code scannen**
   - Scanne einen der generierten QR-Codes (in `qr-codes/`)
   - Position wird auf diesen Punkt gesetzt

3. **Zielraum wählen**
   - Wähle einen Raum aus der Liste

4. **Navigation folgen**
   - Blauer Pfeil zeigt Richtung zum nächsten Wegpunkt
   - Gehe in Pfeilrichtung, Position wird durch Schritte geschätzt

5. **Debug-Overlay** (optional)
   - Tippe auf "DEBUG"-Button oben links
   - Zeigt Sensordaten, Position, Wegpunkt

## QR-Codes generieren

QR-Codes wurden bereits generiert und liegen in `qr-codes/`:

```bash
node src/generate-qr-codes.js  # Falls neu generieren nötig
```

**Drucke die QR-Codes aus** und platziere sie an den entsprechenden Standorten im 3. Stock.

Jeder QR-Code enthält: `{"node":"<knoten-id>"}`

### Beispiel-QR-Codes:
- `entrance_3rd.png` - Eingang 3. Stock (Nullpunkt)
- `room_301.png` - Raum 301
- `room_302.png` - Raum 302
- etc.

## Wichtige Hinweise

### HTTPS erforderlich
Sensoren (DeviceOrientation/DeviceMotion) und Kamera funktionieren nur mit HTTPS!

### PLATZHALTER-Daten
Die Koordinaten in `src/map.json` sind **PLATZHALTER**!

**Du musst:**
1. Den 3. Stock ausmessen
2. Koordinaten der Räume/Gänge eintragen (in Metern, relativ zum Eingang)
3. Kanten (Verbindungen) zwischen Knoten anpassen

**Format in `map.json`:**
```json
{
  "nodes": [
    {
      "id": "room_301",
      "name": "Raum 301",
      "x": 10,    // ← Anpassen!
      "y": 5,     // ← Anpassen!
      "room": true
    }
  ],
  "edges": [
    { "from": "entrance_3rd", "to": "corridor_1" }
  ]
}
```

### Schrittlänge kalibrieren

Standard: 0.7m pro Schritt

Zum Anpassen: In `src/main.ts`:
```typescript
const positionTracker = new PositionTracker({
  stepLength: 0.75  // ← Hier anpassen
});
```

### Schritterkennung verbessern

Falls zu viele/wenige Schritte erkannt werden, Parameter in `src/sensors.js` anpassen:
```javascript
const STEP_THRESHOLD = 1.3;      // Schwellwert erhöhen = weniger Schritte
const MIN_STEP_INTERVAL = 250;   // Mindestabstand in ms
```

## Projektstruktur

```
src/
├── main.ts           - Haupt-App (UI-Flow, Integration)
├── sensors.js        - Sensor-Permission, Orientation, Step-Counter
├── position.js       - Pedestrian Dead Reckoning (Position tracking)
├── routing.js        - Dijkstra, Waypoint-Navigation
├── qr-scanner.js     - QR-Code-Scanner (html5-qrcode)
├── app-state.js      - State Machine (Start → QR → Raum → Navigation)
├── map.json          - Gebäudeplan (PLATZHALTER!)
├── style.css         - Tailwind CSS
└── generate-qr-codes.js - QR-Code Generator

qr-codes/
└── *.png             - Generierte QR-Codes zum Ausdrucken
```

## Troubleshooting

**Sensoren liefern keine Daten:**
- Stelle sicher, dass HTTPS verwendet wird
- iOS: Permission muss durch Nutzer-Geste (Button-Click) angefragt werden
- Aktiviere Debug-Overlay und prüfe Sensor-Werte

**QR-Scanner startet nicht:**
- Kamera-Permission prüfen
- HTTPS erforderlich
- Auf iOS: Safari verwenden (nicht Chrome)

**Pfeil zeigt falsche Richtung:**
- Kompass-Kalibrierung: Handy in Form einer 8 bewegen
- iOS: `webkitCompassHeading` wird genutzt
- Android: Kann ungenauer sein

**Position driftet:**
- Normal bei Pedestrian Dead Reckoning
- QR-Code erneut scannen um Position zu resetten
- Schrittlänge anpassen

**App lädt nicht am Handy:**
- Prüfe ob Handy im gleichen WLAN ist
- Prüfe Firewall (Port 5173 muss erreichbar sein)
- Verwende Network-URL (nicht localhost)

## Nächste Schritte

1. **Gebäudeplan vermessen**
   - Stock ausmessen
   - Koordinaten in `map.json` eintragen

2. **QR-Codes platzieren**
   - Ausdrucken
   - An Wänden/Türen anbringen

3. **Testen & Kalibrieren**
   - Schrittlänge anpassen
   - Schritterkennung optimieren
   - Wegpunkte/Kanten verfeinern

4. **Erweitern** (optional)
   - Mehrere Stockwerke
   - Treppenerkennung
   - Hindernisse/Alternativ-Routen
   - Position-Reset ohne QR (WiFi-Fingerprinting, etc.)
