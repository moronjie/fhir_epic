import { fhirRequest } from "./fhirClient";

export async function getPatientMedications(
  accessToken: string,
  patientId: string
) {
  return fhirRequest(
    accessToken,
    `MedicationRequest?patient=${patientId}`
  );
}