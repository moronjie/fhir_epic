import { NextRequest, NextResponse } from "next/server";
import { getPatient } from "@/lib/epic/patientService";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.headers
      .get("authorization")
      ?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        { error: "Missing access token" },
        { status: 401 }
      );
    }
    
    const { id } = await params;
    const patient = await getPatient(token, id);

    return NextResponse.json(patient);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch patient" },
      { status: 500 }
    );
  }
}