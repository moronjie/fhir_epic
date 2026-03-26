# fhir_epic

Next.js app that connects to Epic's FHIR R4 APIs using SMART on FHIR v2 (OAuth2 + PKCE + private_key_jwt).

More detail on the auth flow lives in `docs/Epic-SMART-v2-Auth-Flow.md`.

## Quickstart

```bash
npm install
npm run dev
```

Create a `.env` (start from `example.env`) and ensure `app/utils/keys/private.pem` matches the JWK you registered with Epic (see `app/utils/keys/jwks.json`).

## Environment variables

- `EPIC_APP_CLIENT_ID`
- `EPIC_APP_REDIRECT_URI`
- `EPIC_FHIR_BASE` (defaults to Epic sandbox R4 base if omitted)
- `EPIC_JWK_KID` (optional; set if Epic expects a `kid` on the client assertion JWT)

## API routes

All routes are under `/api/v1/epic/:action` (see `constant/server/epic.ts`).

- `GET /api/v1/epic/authorize` starts OAuth and sets PKCE cookies.
- `GET /api/v1/epic/redirect?code=...&state=...` exchanges for an access token and sets the `epic_token` cookie.
- `GET /api/v1/epic/patients` returns a FHIR `Bundle` of Patients whose IDs are stored locally.
- `GET /api/v1/epic/get-patient?id=<patientId>` reads a single patient.
- `GET /api/v1/epic/get-appointments?patient=<patientId>` searches Appointments for a patient.
- `GET /api/v1/epic/get-conditions?patient=<patientId>&category=problem-list-item` searches Conditions for a patient.
- `GET /api/v1/epic/get-reports?patient=<patientId>` searches DiagnosticReports for a patient.
- `POST /api/v1/epic/create-patient` creates a patient (and stores the created id locally).
- `POST /api/v1/epic/create-condition` creates a condition for a patient.

Note: there is currently **no** API endpoint in this app to create a `DiagnosticReport` (reports are read-only via `get-reports`).

## Local patient cache

Created Patient IDs are inserted into a local SQLite DB at `data/epic_patients.db` (`lib/db.ts`). The `/api/v1/epic/patients` endpoint reads those IDs, calls `GET Patient/{id}` for each one, and returns a synthetic searchset Bundle for the UI.

## Problems encountered (patients & conditions)

### Creating patients

- Epic can reject Patient creates without an SSN identifier; this project sends `identifier.system = urn:oid:2.16.840.1.113883.4.1` from the `ssn` field.
- The Patient create response can be `201` with an empty/partial body; the created id is often only in the `Location` header (or a `location` field depending on how the response is parsed). `create-patient` now extracts the id from both places before writing to SQLite.

### Fetching patients

- Epic does not provide a simple “list all patients” flow for this use case, and searches with empty demographics are typically rejected/limited.
- A FHIR `batch` Bundle approach was unreliable in practice; the current implementation reads stored IDs from SQLite and does individual `GET Patient/{id}` calls instead.

### Adding/fetching conditions

- Missing SMART scopes can block Condition reads/writes; `authorize` now requests `user/Condition.read user/Condition.search user/Condition.write` (in addition to Patient/Appointment scopes).
- Condition creates can succeed but searches can return `total: 0` unless you search the right slice. The UI defaults to `category=problem-list-item`, and the API forces `clinical-status=active` server-side to reliably return newly-created “active” entries.
- Epic can return `201` with no JSON body for Condition create. `create-condition` now echoes the response `Location` header back to the frontend as `fhirId` so you can confirm the created resource id.
