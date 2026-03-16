# Epic FHIR Provider Authentication Flow (SMART v2)

This document outlines the authentication flow used in this application to integrate with Epic's FHIR APIs for the Provider portal, the specific configuration, and a summary of issues encountered and corrected during implementation.

## Overview

The application connects to Epic FHIR APIs using the **SMART on FHIR v2** framework using **OAuth 2.0 with Asymmetric Client Authentication (JWT Bearer Token)** for Confidential Clients.

### Epic Client Configuration

- **Audience:** Clinicians and Providers.
- **Authentication Method:** Private Key JWT (SMART v2).
- **Client Type:** Confidential.
- **Redirect URI:** Configured optimally to redirect back to the client application's core endpoint.

---

## Authentication Flow Details

The flow involves three main steps:

### 1. Authorization Request (User Login)

When the user initiates a login (e.g., clicking "Connect with Epic"), the app generates a PKCE `code_verifier` and `code_challenge`, along with a robust `state` token to prevent CSRF. The user is redirected to Epic's OAuth 2.0 Authorize endpoint (`/oauth2/authorize`).

- **Required parameters:** `response_type=code`, `client_id`, `redirect_uri`, `scope`, `aud` (FHIR Base URL), `state`, `code_challenge`, and `code_challenge_method=S256`.

### 2. Epic Callback (Redirect)

Following successful login and consent, Epic redirects back to the configured `redirect_uri` (which corresponds to the root route `/` in this app configuration). The URL inherits the `code` and the generic `state` parameters from Epic.

### 3. Token Exchange (Asymmetric Client Authentication)

For confidential clients, SMART v2 strictly requires proving identity during the token exchange using a freshly signed JWT (`client_assertion`).
The backend generates this JWT signed with the app's RS256 Private Key, ensuring it precisely validates against the JWK imported during the Epic client registration.
This JWT is sent, alongside the `code` and `code_verifier`, to Epic's `/oauth2/token` endpoint to acquire the `access_token`.

---

## Implementation Mistakes and Corrections

During the initial setup and implementation, a few critical issues prevented end-to-end authentication. These errors were identified and resolved to stabilize the application's connection.

### 1. UI Redirection Ignored the Callback Parameters

**Mistake:**
The application had an environment variable `EPIC_APP_REDIRECT_URI` set to `http://localhost:3000/`. When Epic redirected back, the parameters (`?code=...&state=...`) were appended to the root page (`app/page.tsx`). However, the UI completely ignored these parameters, and no code execution passed them onto the backend API (`/api/v1/epic/redirect`) for the next step.

**Correction:**
We added client-side logic utilizing React's `useEffect` inside `app/page.tsx` that scans the `window.location.search` array. If an authorization `code` and `state` exist, it instantly routes the client off to `/api/v1/epic/redirect?code=${code}&state=${state}`. Additionally, if an error presents from Epic, it forwards that error to the backend as well.

### 2. Invalid Claims in the Signed JWT `client_assertion`

**Mistake:**
The asymmetric client authentication process failed because the JWT `client_assertion` lacked strictly required claims per SMART on FHIR specifications. Initially, the JWT merely used an expiration limit (10m) without timestamps enforcing issuance timings.

**Correction:**
We updated `app/utils/signjwt.ts` to include precise, strict timestamp limitations required by Epic servers:

- **`iat` (Issued At):** Added as `Math.floor(Date.now() / 1000)`
- **`nbf` (Not Before):** Added as `Math.floor(Date.now() / 1000)`
- **`exp` (Expiration Time):** Reduced to a strict 5-minute validity window (`"5m"`).

### 3. Invalid Formatting in Token Exchange Payload

**Mistake:**
When sending the `POST` request to exchange the code for the token, there were potential issues ensuring the specific static values passed inside the encoded URL parameters exactly abided by OAuth 2.0 specs.

**Correction:**
We verified that the token endpoint receives properly formatted data (via `URLSearchParams`) in `app/api/v1/epic/[action]/route.ts`, solidifying the `client_assertion_type` parameter distinctly as `"urn:ietf:params:oauth:client-assertion-type:jwt-bearer"` and attaching the corrected signed JWT as the `client_assertion`.

---

## Patient Resource Integration Updates

Following the initial authentication implementation, several specific requirements from the Epic FHIR API were identified when interacting with the Patient resource.

### 1. Patient Creation (Missing Identifier)

**Mistake:**
When attempting to `POST` to the Patient creation endpoint, Epic rejected the payload with a `required` code error indicating a missing `identifier(ssn)`. Early payloads did not include a Social Security Number, which Epic considers a vital required field for patient matching or creation.

**Correction:**

1. The frontend form (`app/components/AddPatientModal.tsx`) was updated to explicitly prompt for an SSN.
2. The `POST /api/v1/epic/create-patient` backend handler was updated to parse `ssn` and actively push an `identifier` object into the FHIR payload:
   ```json
   "identifier": [
     {
       "use": "official",
       "system": "urn:oid:2.16.840.1.113883.4.1",
       "value": "<cleaned_ssn>"
     }
   ]
   ```

### 2. Patient Demographics Search (Strict Parameters)

**Mistake:**
Standard searches utilizing basic `name` or general queries resulted in unoptimized or entirely rejected responses from Epic's backend. Epic specifically expects strict query parameters for name matching (e.g., `given`, `family`) and strictly limits return payloads to a requested `_count`.

**Correction:**
The patient search API (`GET /api/v1/epic/patients`) was refactored:

- The generic `name` parameter was explicitly mapped to `given` in the search parameters.
- Optional fallback parameters (like a default `family` or hardcoded `given` name defaults like "Awal") were configured for testing.
- The `_count` was explicitly restricted from standard queries (e.g., down to `20`) to ensure response times stay consistently fast and avoid timeout or payload limit rejections from Epic servers.

**NOTES:**

- The epic fhir system do not allow fetching all patients at once. We have to fetch patients in batches.
- The epic fhir system do not allow fetching patients with empty name or family. We have to provide a name or family to fetch patients.
- The epic fhir do not also allow searching with ssn unless special previliges are granted.
- To get pateints list we have to fetch the records using a work around. when we create a patient we add his patient id into db and then fetch the records using the patient id. The Epic system allows fetching in bundles, this gives us performance boost.
