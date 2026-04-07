# Desiva — Zarządzanie Produkcją

System zarządzania zamówieniami i śledzenia produkcji.

## Tech Stack

- **Next.js 14** (App Router)
- **Prisma ORM** + SQLite
- **Tailwind CSS**
- **Recharts** (wykresy)
- **JWT** (autentykacja)

## Szybki start

```bash
# 1. Zainstaluj zależności
npm install

# 2. Utwórz bazę danych i wypełnij danymi początkowymi
npm run setup

# 3. Uruchom serwer deweloperski
npm run dev
```

Aplikacja będzie dostępna pod adresem **http://localhost:3000**

## Konta demo

| Login      | Hasło        | Rola     | Stawka |
|------------|--------------|----------|--------|
| Admin      | Desiva2025!  | Admin    | —      |
| Biuro      | Biuro1       | Office   | —      |
| Marta      | MAZA         | Worker   | 35 PLN/h |
| Krzysztof  | KRST         | Worker   | 40 PLN/h |

## Struktura aplikacji

### Widoki (role → dostęp)

| Widok                  | Admin | Office | Worker |
|------------------------|-------|--------|--------|
| Śledzenie biuro        | ✅    | ✅     | ❌     |
| Śledzenie produkcja    | ✅    | ✅     | ❌     |
| Zamówienia             | ✅    | ✅     | ❌     |
| Archiwum               | ✅    | ❌     | ❌     |
| Statystyki (Dashboard) | ✅    | ❌     | ❌     |
| Ustawienia             | ✅    | ❌     | ❌     |
| Widok Pracownika       | ❌    | ❌     | ✅     |

### Etapy produkcji (domyślne)

1. Konsultacja z klientem *(biuro)*
2. Księgowość *(biuro)*
3. Płatność *(biuro)*
4. Przygotowanie do produkcji *(biuro)*
5. Przygotowanie profili *(produkcja)*
6. Spawanie *(produkcja)*
7. Szlifowanie *(produkcja)*
8. Malarnia *(produkcja)*
9. Składanie *(produkcja)*
10. Wysyłka *(produkcja)*

### Logika timera (Widok Pracownika)

1. Pracownik klika **Start** → timer startuje, zapis w bazie
2. Pracownik klika **Pauza** → timer się zatrzymuje, czas zapisany
3. Pracownik klika **Start** ponownie → nowy chunk czasu
4. Pracownik klika **Zakończ etap** → czas zapisany, zamówienie przechodzi do następnego etapu
5. Koszt = czas (h) × stawka godzinowa pracownika

### Archiwum

Gdy zamówienie przejdzie przez ostatni etap (10), trafia do archiwum z podsumowaniem:
- Łączny czas biuro / produkcja
- Czas i koszt na pracownika
- Czas i koszt na etap
- Łączny koszt produkcji

## Komendy

```bash
npm run dev          # Serwer deweloperski
npm run build        # Build produkcyjny
npm run start        # Uruchom build produkcyjny
npm run db:migrate   # Migracja bazy danych
npm run db:seed      # Wypełnij bazę danymi początkowymi
npm run db:reset     # Resetuj bazę (uwaga: usuwa dane!)
npm run setup        # migrate + seed (pierwszy raz)
```

## Struktura plików

```
├── prisma/
│   ├── schema.prisma    # Schemat bazy danych
│   └── seed.ts          # Dane początkowe
├── src/
│   ├── app/
│   │   ├── api/         # API routes (REST)
│   │   ├── login/       # Strona logowania
│   │   ├── (dashboard)/ # Widoki admin/office (z sidebar)
│   │   └── worker/      # Widok pracownika
│   ├── components/      # Komponenty React
│   └── lib/             # Prisma, auth, utils
└── public/uploads/      # Pliki załączone do zamówień
```

---

## Wdrożenie na VPS (Production)

### Wymagania

- Node.js 18+ 
- PostgreSQL 14+
- Nginx
- Certbot (SSL)

### 1. Przygotowanie serwera

```bash
# Zainstaluj Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Zainstaluj PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Zainstaluj Nginx
sudo apt-get install -y nginx
```

### 2. Baza danych

```bash
sudo -u postgres createuser desiva -P
sudo -u postgres createdb desiva -O desiva
```

### 3. Aplikacja

```bash
# Sklonuj repozytorium
git clone <repo-url> /var/www/desiva/app
cd /var/www/desiva/app/order-tracker

# Skopiuj i uzupełnij zmienne środowiskowe
cp .env.example .env
# Edytuj .env:
#   DATABASE_URL="postgresql://desiva:<hasło>@localhost:5432/desiva?schema=public"
#   JWT_SECRET="<wygeneruj: openssl rand -base64 48>"
#   UPLOAD_DIR="/var/www/desiva/uploads"
#   NODE_ENV="production"

# Zainstaluj zależności
npm ci

# Uruchom migracje
npx prisma migrate deploy

# Utwórz konto administratora
ADMIN_PASSWORD="<silne-hasło>" npx tsx prisma/seed-prod.ts

# Zbuduj aplikację
npm run build

# Przygotuj standalone
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/

# Utwórz katalog uploadów
mkdir -p /var/www/desiva/uploads
```

### 4. Konfiguracja Nginx

Utwórz `/etc/nginx/sites-available/desiva`:

```nginx
server {
    listen 80;
    server_name twoja-domena.pl;

    # Pliki uploadowane — serwowane bezpośrednio przez Nginx
    location /uploads/ {
        alias /var/www/desiva/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Pliki statyczne Next.js
    location /_next/static/ {
        alias /var/www/desiva/app/order-tracker/.next/static/;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    # Proxy do Next.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 20M;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/desiva /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 5. Usługa systemd

Utwórz `/etc/systemd/system/desiva.service`:

```ini
[Unit]
Description=Desiva Order Tracker
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/desiva/app/order-tracker
ExecStart=/usr/bin/node .next/standalone/server.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000
EnvironmentFile=/var/www/desiva/app/order-tracker/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable desiva
sudo systemctl start desiva
```

### 6. SSL (HTTPS)

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d twoja-domena.pl
```

### 7. Aktualizacja aplikacji

```bash
cd /var/www/desiva/app/order-tracker
git pull origin main
npm ci
npx prisma migrate deploy
npm run build
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/
sudo systemctl restart desiva
```
