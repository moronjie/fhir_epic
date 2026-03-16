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
        APPOINTMENT_SEARCH: (query?: Record<string, string>) =>
            query ? `${EPIC_FHIR_BASE}/Appointment?${qs.stringify(query)}` : `${EPIC_FHIR_BASE}/Appointment`,
        CONDITION_SEARCH: (query?: Record<string, string>) =>
            query ? `${EPIC_FHIR_BASE}/Condition?${qs.stringify(query)}` : `${EPIC_FHIR_BASE}/Condition`,
        CONDITION_CREATE: `${EPIC_FHIR_BASE}/Condition`,
        DIAGNOSTIC_REPORT_SEARCH: (query?: Record<string, string>) =>
            query ? `${EPIC_FHIR_BASE}/DiagnosticReport?${qs.stringify(query)}` : `${EPIC_FHIR_BASE}/DiagnosticReport`,
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
        GET_PATIENT: 'get-patient',
        CREATE_PATIENT: 'create-patient',
        GET_APPOINTMENTS: 'get-appointments',
        GET_CONDITIONS: 'get-conditions',
        CREATE_CONDITION: 'create-condition',
        GET_REPORTS: 'get-reports',
    }
}

export {
    EPIC_ENDPOINTS,
    EPIC
}