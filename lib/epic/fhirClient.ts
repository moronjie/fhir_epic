const FHIR_BASE = process.env.EPIC_FHIR_BASE;

export async function fhirRequest(
  accessToken: string,
  path: string
) {
  const url = `${FHIR_BASE}/${path}`;

  console.log("FHIR Request URL:", url);
  console.log("Access Token (first 20 chars):", accessToken.substring(0, 20) + "...");

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/fhir+json",
    },
  });

  console.log("FHIR Response Status:", res.status);
  console.log("FHIR Response Headers:", Object.fromEntries(res.headers.entries()));

  if (!res.ok) {
    const error = await res.text();
    console.error("FHIR Error Response:", error);
    throw new Error(`FHIR request failed (${res.status}): ${error}`);
  }

  return res.json();
}