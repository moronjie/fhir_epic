import { generatePKCE } from "@/app/utils/pkce";
import { EPIC, EPIC_ENDPOINTS } from "@/constant/server/epic";
import { NextRequest, NextResponse } from "next/server";
import createClientAssertion from "@/app/utils/signjwt";

interface RouteParams {
  params: Promise<{
    action: string;
  }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { action } = await params;

  switch (action) {
    case EPIC.OAUTH_ACTIONS.AUTHORIZE: {
      const { codeVerifier, codeChallenge } = generatePKCE();
      const state = crypto.randomUUID();

      console.log("[AUTHORIZE] Starting OAuth flow");

      const response = NextResponse.redirect(
        EPIC_ENDPOINTS.OAUTH.AUTHORIZE({
          response_type: "code",
          client_id: process.env.EPIC_APP_CLIENT_ID,
          redirect_uri: process.env.EPIC_APP_REDIRECT_URI,
          scope: "openid fhirUser launch offline_access user/Patient.read user/Patient.write user/Appointment.read",          aud: process.env.EPIC_FHIR_BASE,
          state: state,
          code_challenge: codeChallenge,
          code_challenge_method: "S256",
        }),
      );

      response.cookies.set("pkce_verifier", codeVerifier, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 600,
      });

      response.cookies.set("oauth_state", state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 600,
      });

      return response;
    }

    case EPIC.OAUTH_ACTIONS.REDIRECT: {
      const code = req.nextUrl.searchParams.get("code");
      const returnedState = req.nextUrl.searchParams.get("state");
      const error = req.nextUrl.searchParams.get("error");
      const errorDescription = req.nextUrl.searchParams.get("error_description");

      console.log("[REDIRECT] Received callback");

      if (error) {
        console.error("[REDIRECT] OAuth error:", error, errorDescription);
        return NextResponse.json(
          { error, error_description: errorDescription },
          { status: 400 },
        );
      }

      if (!code) {
        return NextResponse.json(
          { error: "Authorization code missing" },
          { status: 400 },
        );
      }

      const storedState = req.cookies.get("oauth_state")?.value;
      const codeVerifier = req.cookies.get("pkce_verifier")?.value;

      if (!storedState || storedState !== returnedState) {
        console.error("[REDIRECT] State mismatch!");
        return NextResponse.json(
          { error: "Invalid state parameter" },
          { status: 400 },
        );
      }

      if (!codeVerifier) {
        console.error("[REDIRECT] Missing PKCE verifier!");
        return NextResponse.json(
          { error: "Missing PKCE verifier" },
          { status: 400 },
        );
      }

      console.log("GENERATE: generating accession");
      const clientAssertion = await createClientAssertion();
      // console.log("CLIENT ASSERTION:", code);
      console.log("[REDIRECT] Exchanging code for token...");

      const tokenResponse = await fetch(EPIC_ENDPOINTS.OAUTH.TOKEN, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
                  grant_type: "authorization_code",
                  code,
                  redirect_uri: process.env.EPIC_APP_REDIRECT_URI!,
                  client_id: process.env.EPIC_APP_CLIENT_ID!,
                  code_verifier: codeVerifier,
                  client_assertion_type:"urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
                  client_assertion: clientAssertion,
        }),
      });

      const tokenData = await tokenResponse.json();

      // console.log("[REDIRECT] Token response status:", tokenResponse);

      if (!tokenResponse.ok) {
        return NextResponse.json(
          { error: "Token exchange failed", details: tokenData },
          { status: tokenResponse.status },
        );
      }

      // Redirect to dashboard and store token in httpOnly cookie
      const baseUrl = req.nextUrl.origin;
      const response = NextResponse.redirect(`${baseUrl}/dashboard/patients`);

      response.cookies.set("epic_token", tokenData.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: tokenData.expires_in || 3600,
      });

      // Store a non-httpOnly flag so the client can check auth status
      response.cookies.set("epic_authenticated", "true", {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: tokenData.expires_in || 3600,
      });

      response.cookies.delete("oauth_state");
      response.cookies.delete("pkce_verifier");

      return response;
    }

    case EPIC.FHIR_ACTIONS.PATIENTS: {
      const accessToken = req.cookies.get("epic_token")?.value;

      if (!accessToken) {
        return NextResponse.json(
          { error: "Not authenticated" },
          { status: 401 },
        );
      }

      try {
        const searchParams: Record<string, string> = {};
        const name = req.nextUrl.searchParams.get("name");
        // const family = req.nextUrl.searchParams.get("family");
        if (name) searchParams["given"] = name; else searchParams["given"] = "Awal";
        // if (family) searchParams["family"] = family; else searchParams["family"] = "Sulemana";
        searchParams["_count"] = req.nextUrl.searchParams.get("_count") || "20";
        // searchParams["birthdate"] = req.nextUrl.searchParams.get("birthdate") || "1999-10-05";

        // console.log("[PATIENTS] Searching for patients with params:", EPIC_ENDPOINTS.FHIR.PATIENT_SEARCH(searchParams));

        const fhirResponse = await fetch(
          EPIC_ENDPOINTS.FHIR.PATIENT_SEARCH(searchParams),
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/fhir+json",
            },
          },
        );


        const rawText = await fhirResponse.text();

        let data;
        try {
          data = rawText ? JSON.parse(rawText) : null;
        } catch (e) {
          console.error("[PATIENTS] Failed to parse JSON. Raw body:", rawText);
          data = { rawText };
        }

        if (!fhirResponse.ok) {
          console.error(`[PATIENTS] Request failed with status ${fhirResponse.status}:`, data);
          return NextResponse.json(
            { error: "FHIR request failed", details: data },
            { status: fhirResponse.status },
          );
        }

        return NextResponse.json(data);
      } catch (err: any) {
        console.error("[PATIENTS] Error:", err);
        return NextResponse.json(
          { error: "Failed to fetch patients", message: err.message },
          { status: 500 },
        );
      }
    }

    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { action } = await params;

  switch (action) {
    case EPIC.FHIR_ACTIONS.CREATE_PATIENT: {
      const accessToken = req.cookies.get("epic_token")?.value;

      if (!accessToken) {
        return NextResponse.json(
          { error: "Not authenticated" },
          { status: 401 },
        );
      }

      try {
        const body = await req.json();
        const {
          familyName,
          givenName,
          gender,
          birthDate,
          phone,
          addressLine,
          city,
          state,
          postalCode,
          ssn,
        } = body;

        // Build FHIR Patient resource
        const patientResource: any = {
          resourceType: "Patient",
          name: [
            {
              use: "official",
              family: familyName,
              given: [givenName],
            },
          ],
          gender: gender || "unknown",
        };

        if (birthDate) {
          patientResource.birthDate = birthDate;
        }

        if (ssn) {
          patientResource.identifier = [
            {
              use: "official",
              system: "urn:oid:2.16.840.1.113883.4.1",
              value: ssn.replace(/\D/g, ""),
            },
          ];
        }

        if (phone) {
          patientResource.telecom = [
            {
              system: "phone",
              value: phone,
              use: "mobile",
            },
          ];
        }

        if (addressLine || city || state || postalCode) {
          patientResource.address = [
            {
              use: "home",
              line: addressLine ? [addressLine] : [],
              city: city || "",
              state: state || "",
              postalCode: postalCode || "",
              country: "US",
            },
          ];
        }

        // console.log("[CREATE_PATIENT] Creating patient:", JSON.stringify(patientResource, null, 2));

        const fhirResponse = await fetch(
          EPIC_ENDPOINTS.FHIR.PATIENT_CREATE,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/fhir+json",
              Accept: "application/fhir+json",
            },
            body: JSON.stringify(patientResource),
          },
        );

        // console.log("[CREATE_PATIENT] FHIR response:", fhirResponse);
        const rawText = await fhirResponse.text();
        let data;
        try {
          data = rawText ? JSON.parse(rawText) : { rawText };
        } catch (e) {
          console.error("[CREATE_PATIENT] Failed to parse JSON. Raw body:", rawText);
          data = { rawText };
        }

        if (!fhirResponse.ok) {
          // console.error("[CREATE_PATIENT] FHIR error:", data);
          console.dir(data, { depth: 4 });
          return NextResponse.json(
            { error: "Failed to create patient", details: data },
            { status: fhirResponse.status },
          );
        }

        return NextResponse.json(data, { status: 201 });
      } catch (err: any) {
        console.error("[CREATE_PATIENT] Error:", err);
        return NextResponse.json(
          { error: "Failed to create patient", message: err.message },
          { status: 500 },
        );
      }
    }

    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
}
