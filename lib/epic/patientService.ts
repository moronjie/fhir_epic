import { fhirRequest } from "./fhirClient";

export async function getPatient(
  accessToken: string,
  patientId: string
) {
  return fhirRequest(accessToken, `Patient/${patientId}`);
}