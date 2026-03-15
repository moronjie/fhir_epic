import { NextRequest, NextResponse } from "next/server";
import { getPatientObservations } from "@/lib/epic/observationService";

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

    const observations = await getPatientObservations(
      token,
      patientId
    );

    return NextResponse.json(observations);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch observations" },
      { status: 500 }
    );
  }
}