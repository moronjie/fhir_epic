import { NextRequest, NextResponse } from "next/server";
import { getPatientMedications } from "@/lib/epic/medicationService";

export async function GET(req: NextRequest) {
  try {
    const token = req.headers
      .get("authorization")
      ?.replace("Bearer ", "");

    const patientId = req.nextUrl.searchParams.get("patient");

    if (!token) {
      return NextResponse.json(
        { error: "Missing access token" },
        { status: 401 }
      );
    }

    if (!patientId) {
      return NextResponse.json(
        { error: "Missing patient id" },
        { status: 400 }
      );
    }

    const medications = await getPatientMedications(
      token,
      patientId
    );

    return NextResponse.json(medications);
  } catch (error) {
    console.error("Medication fetch error:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch medications",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}