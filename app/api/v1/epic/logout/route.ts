import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("epic_token");
  response.cookies.delete("epic_authenticated");
  return response;
}
