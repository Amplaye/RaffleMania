# Istruzioni per Ricompilare l'App

La funzionalità foto è stata implementata ma richiede una ricompilazione nativa per funzionare.

⚠️ **IMPORTANTE**: La build da terminale sta fallendo a causa di un problema con RCTSwiftUI. DEVI usare Xcode.

## Passi da seguire:

### 1. Apri il progetto in Xcode
```bash
cd /Users/amplaye/rafflemania/ios
open RaffleManiaApp.xcworkspace
```
**NOTA**: Assicurati di aprire il file `.xcworkspace` e NON il file `.xcodeproj`

### 2. Seleziona il Target Corretto
In Xcode:
- Nella barra in alto, clicca sul menu a tendina del dispositivo
- Seleziona un simulatore (es. "iPhone 16" o "iPhone 13 Pro")

### 3. Clean Build Folder
In Xcode:
- Premi **Cmd + Shift + K** (Clean Build Folder)
- Oppure vai su **Product → Clean Build Folder**
- Aspetta che finisca (barra di progresso in alto)

### 4. Ricompila e Avvia
- Premi **Cmd + R** (Build & Run)
- Oppure clicca sul pulsante ▶️ in alto a sinistra
- **La prima build può richiedere 3-5 minuti**
- Se vedi errori, riprova con Clean Build Folder

### 4. Testa la Funzionalità
Una volta avviata l'app:
1. Vai nel **Profilo** → **Personalizza Avatar**
2. Clicca sulla tab **Foto** (terza tab con icona fotocamera)
3. Prova a cliccare su:
   - **"Galleria"** per scegliere una foto dalla libreria (funziona sul simulatore)
   - **"Scatta Foto"** funziona solo su dispositivo reale, non sul simulatore

### Cosa è stato implementato:

✅ **react-native-image-picker** installato
✅ **Permessi iOS** aggiunti in Info.plist:
   - NSCameraUsageDescription
   - NSPhotoLibraryUsageDescription
✅ **Store aggiornato** per salvare la foto personalizzata
✅ **UI completa** con:
   - Tab "Foto" nella schermata avatar
   - Due pulsanti: "Scatta Foto" e "Galleria"
   - Preview della foto selezionata
   - Pulsante per rimuovere la foto
✅ **Logging dettagliato** per debug (guarda il terminale Metro per i log)

### Note importanti:
- La **fotocamera non funziona sul simulatore**, solo su dispositivo reale
- La **galleria funziona sul simulatore**
- Se vedi errori, controlla i log nel terminale Metro

### In caso di problemi:
Se la build fallisce in Xcode, prova:
```bash
cd /Users/amplaye/rafflemania/ios
pod deintegrate
pod install
```
Poi riapri in Xcode e riprova il build.
