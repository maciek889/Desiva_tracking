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
