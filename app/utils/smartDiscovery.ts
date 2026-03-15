export interface SmartConfiguration {
  authorization_endpoint: string
  token_endpoint: string
  jwks_uri: string
  issuer: string
}

export async function getSmartConfig(fhirBase: string): Promise<SmartConfiguration> {
  const res = await fetch(`${fhirBase}/.well-known/smart-configuration`)

  if (!res.ok) {
    throw new Error("Failed to fetch SMART configuration")
  }

  return res.json()
}