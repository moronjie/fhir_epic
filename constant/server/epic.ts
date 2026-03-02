import qs from 'querystring';

const EPIC_OAUTH_URL = 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2';

const EPIC_ENDPOINTS = {
    OAUTH : {
        AUTHORIZE: (query: any) => `${EPIC_OAUTH_URL}/authorize?${qs.stringify(query)}`,
        TOKEN: `${EPIC_OAUTH_URL}/token`
     }
}   

const EPIC = {
    OAUTH_ACTIONS: {
        AUTHORIZE: 'authorize',
        REDIRECT: 'redirect',
        TOKEN: 'token'
    }
}

export {
    EPIC_ENDPOINTS,
    EPIC
}