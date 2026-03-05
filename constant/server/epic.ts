import qs from 'querystring';

const EPIC_OAUTH_URL = 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2';
const EPIC_FHIR_BASE = process.env.EPIC_FHIR_BASE || 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4';

const EPIC_ENDPOINTS = {
    OAUTH: {
        AUTHORIZE: (query: any) => `${EPIC_OAUTH_URL}/authorize?${qs.stringify(query)}`,
        TOKEN: `${EPIC_OAUTH_URL}/token`
    },
    FHIR: {
        PATIENT_SEARCH: (query?: Record<string, string>) =>
            query ? `${EPIC_FHIR_BASE}/Patient?${qs.stringify(query)}` : `${EPIC_FHIR_BASE}/Patient`,
        PATIENT_READ: (id: string) => `${EPIC_FHIR_BASE}/Patient/${id}`,
        PATIENT_CREATE: `${EPIC_FHIR_BASE}/Patient`,
    }
}

const EPIC = {
    OAUTH_ACTIONS: {
        AUTHORIZE: 'authorize',
        REDIRECT: 'redirect',
        TOKEN: 'token'
    },
    FHIR_ACTIONS: {
        PATIENTS: 'patients',
        CREATE_PATIENT: 'create-patient',
    }
}

export {
    EPIC_ENDPOINTS,
    EPIC
}