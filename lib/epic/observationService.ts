import { fhirRequest } from "./fhirClient";

export async function getPatientObservations(
  accessToken: string,
  patientId: string
) {
  return fhirRequest(
    accessToken,
    `Observation?patient=${patientId}`
  );
}