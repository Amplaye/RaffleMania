# RaffleMania API - Plugin WordPress

Plugin WordPress per gestire il backend dell'app RaffleMania.

## Installazione

1. **Carica il plugin via FTP**
   - Carica la cartella `rafflemania-api` in `/wp-content/plugins/`

2. **Oppure via Admin WordPress**
   - Comprimi la cartella `rafflemania-api` in un file ZIP
   - Vai su Plugin > Aggiungi nuovo > Carica plugin
   - Seleziona il file ZIP e installa

3. **Attiva il plugin**
   - Vai su Plugin e clicca "Attiva" su RaffleMania API

4. **Verifica l'installazione**
   - Vai su RaffleMania nel menu admin
   - Le tabelle del database vengono create automaticamente
   - Vengono inseriti alcuni premi di esempio

## API Endpoints

### Base URL
```
https://tuosito.com/wp-json/rafflemania/v1/
```

### Autenticazione
- `POST /auth/register` - Registrazione utente
- `POST /auth/login` - Login utente
- `POST /auth/logout` - Logout
- `POST /auth/refresh` - Rinnova token
- `GET /auth/verify` - Verifica token (richiede auth)

### Premi
- `GET /prizes` - Lista tutti i premi attivi
- `GET /prizes/{id}` - Dettaglio premio
- `POST /prizes/{id}/increment-ads` - Incrementa contatore ads (richiede auth)
- `GET /prizes/{id}/timer` - Stato timer del premio

### Biglietti
- `GET /tickets` - Biglietti dell'utente (richiede auth)
- `POST /tickets` - Crea nuovo biglietto (richiede auth)
- `GET /tickets/prize/{prize_id}` - Biglietti per premio (richiede auth)
- `GET /tickets/pool/{prize_id}` - Totale biglietti nel pool

### Estrazioni
- `GET /draws` - Lista estrazioni
- `GET /draws/prize/{prize_id}` - Estrazioni per premio
- `GET /draws/{id}` - Dettaglio estrazione
- `GET /draws/{id}/result` - Risultato estrazione
- `GET /draws/{id}/check-result` - Verifica se utente ha vinto (richiede auth)

### Utenti
- `GET /users/me` - Profilo utente (richiede auth)
- `PUT /users/me` - Aggiorna profilo (richiede auth)
- `GET /users/me/streak` - Info streak (richiede auth)
- `POST /users/me/streak/claim` - Riscuoti streak giornaliera (richiede auth)
- `GET /users/me/level` - Info livello (richiede auth)
- `POST /users/me/xp` - Aggiungi XP (richiede auth)
- `GET /users/me/credits` - Crediti e transazioni (richiede auth)
- `POST /users/me/credits/purchase` - Acquista crediti (richiede auth)
- `GET /users/me/referral` - Info referral (richiede auth)
- `POST /users/me/referral/use` - Usa codice referral (richiede auth)
- `PUT /users/me/push-token` - Aggiorna push token (richiede auth)
- `GET /users/me/wins` - Vincite utente (richiede auth)
- `GET /users/leaderboard` - Classifica

### Vincitori
- `GET /winners` - Lista vincitori recenti
- `GET /winners/prize/{prize_id}` - Vincitori per premio
- `POST /winners/{id}/claim` - Riscuoti premio (richiede auth)

## Autenticazione

Gli endpoint che richiedono autenticazione necessitano di un header:
```
Authorization: Bearer <access_token>
```

Il token si ottiene dalla risposta di login/register.

## Esempio di utilizzo nell'app React Native

```javascript
// Configurazione API
const API_BASE = 'https://tuosito.com/wp-json/rafflemania/v1';

// Login
const login = async (email, password) => {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  // Salva data.data.tokens.access_token
  return data;
};

// Fetch prizes
const getPrizes = async () => {
  const response = await fetch(`${API_BASE}/prizes`);
  const data = await response.json();
  return data.data.prizes;
};

// Create ticket (richiede auth)
const createTicket = async (prizeId, token) => {
  const response = await fetch(`${API_BASE}/tickets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ prize_id: prizeId, source: 'ad' })
  });
  return response.json();
};
```

## Pannello Admin

Il plugin aggiunge un menu "RaffleMania" nell'admin con:
- **Dashboard** - Statistiche generali
- **Premi** - Gestione premi (crea, modifica, elimina)
- **Estrazioni** - Storico estrazioni
- **Utenti** - Lista utenti app
- **Vincitori** - Lista vincitori e stato spedizioni
- **Impostazioni** - Configurazione plugin

## Estrazioni Automatiche

Le estrazioni vengono gestite automaticamente:
1. Quando un premio raggiunge il `goal_ads`, parte il timer
2. Al termine del timer, viene eseguita l'estrazione automatica
3. Il vincitore viene determinato casualmente tra i biglietti
4. Il premio viene resettato per una nuova estrazione

## Tabelle Database

Il plugin crea le seguenti tabelle:
- `wp_rafflemania_users` - Utenti app
- `wp_rafflemania_prizes` - Premi
- `wp_rafflemania_tickets` - Biglietti
- `wp_rafflemania_draws` - Estrazioni
- `wp_rafflemania_winners` - Vincitori
- `wp_rafflemania_transactions` - Transazioni crediti
- `wp_rafflemania_streaks` - Storico streak
- `wp_rafflemania_referrals` - Referral

## Supporto

Per problemi o domande, contatta lo sviluppatore.
