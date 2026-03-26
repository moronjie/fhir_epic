import { generatePKCE } from "@/app/utils/pkce";
import { EPIC, EPIC_ENDPOINTS } from "@/constant/server/epic";
import { NextRequest, NextResponse } from "next/server";
import createClientAssertion from "@/app/utils/signjwt";
import db from "@/lib/db";

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
          // scope: "openid fhirUser launch offline_access user/Patient.read user/Patient.write user/Appointment.read",
          scope: "openid fhirUser launch offline_access user/Patient.read user/Patient.write user/Appointment.read user/Condition.read user/Condition.search user/Condition.write",
          aud: process.env.EPIC_FHIR_BASE,
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
      // console.log("[REDIRECT] Exchanging code for token...");

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
          client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
          client_assertion: clientAssertion,
        }),
      });

      const tokenData = await tokenResponse.json();

      console.log("[REDIRECT] Token response status:", tokenData);

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
        const stmt = db.prepare('SELECT id FROM patients ORDER BY created_at DESC');
        const rows = stmt.all() as { id: string }[];

        if (rows.length === 0) {
          return NextResponse.json({ entry: [] });
        }

        const patients: any[] = [];

        for (const row of rows) {
          try {
            const res = await fetch(`${process.env.EPIC_FHIR_BASE}/Patient/${row.id}`, {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/fhir+json",
              },
            });

            const data = await res.json().catch(() => null);
            if (res.ok && data) {
              patients.push({
                fullUrl: `urn:uuid:${row.id}`,
                resource: data,
              });
            } else {
              console.warn(`Failed to fetch patient ${row.id}`, data);
            }
          } catch (err) {
            console.error(`Error fetching patient ${row.id}`, err);
          }
        }

        return NextResponse.json({
          resourceType: "Bundle",
          type: "searchset",
          total: patients.length,
          entry: patients,
        });
      } catch (err: any) {
        console.error("[PATIENTS_BATCH] Error:", err);
        return NextResponse.json(
          { error: "Failed to fetch patients", message: err.message },
          { status: 500 },
        );
      }
    }

    case EPIC.FHIR_ACTIONS.GET_PATIENT: {
      const accessToken = req.cookies.get("epic_token")?.value;

      if (!accessToken) {
        return NextResponse.json(
          { error: "Not authenticated" },
          { status: 401 },
        );
      }

      try {
        const patientId = req.nextUrl.searchParams.get("id") || "eqnN2s-yIknoe9Q3yjkfFQg3";

        console.log(`[GET_PATIENT] Fetching patient with ID: ${patientId}`);

        const fhirResponse = await fetch(
          EPIC_ENDPOINTS.FHIR.PATIENT_READ(patientId),
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
          console.error("[GET_PATIENT] Failed to parse JSON. Raw body:", rawText);
          data = { rawText };
        }

        console.log("[GET_PATIENT] Response status:", fhirResponse.status);
        console.log("[GET_PATIENT] Response data:", JSON.stringify(data, null, 2));

        if (!fhirResponse.ok) {
          console.error(`[GET_PATIENT] Request failed with status ${fhirResponse.status}:`, data);
          return NextResponse.json(
            { error: "FHIR request failed", details: data },
            { status: fhirResponse.status },
          );
        }

        return NextResponse.json(data);
      } catch (err: any) {
        console.error("[GET_PATIENT] Error:", err);
        return NextResponse.json(
          { error: "Failed to fetch patient", message: err.message },
          { status: 500 },
        );
      }
    }

    case EPIC.FHIR_ACTIONS.GET_APPOINTMENTS: {
      const accessToken = req.cookies.get("epic_token")?.value;
      if (!accessToken) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
      try {
        const patientId = req.nextUrl.searchParams.get("patient");
        if (!patientId) return NextResponse.json({ error: "Missing patient ID" }, { status: 400 });
        const fhirResponse = await fetch(EPIC_ENDPOINTS.FHIR.APPOINTMENT_SEARCH({ patient: patientId }), {
          headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/fhir+json" }
        });
        const data = await fhirResponse.text().then(t => t ? JSON.parse(t) : null).catch(() => null);
        if (!fhirResponse.ok) return NextResponse.json({ error: "FHIR request failed", details: data }, { status: fhirResponse.status });
        return NextResponse.json(data);
      } catch (err: any) {
        return NextResponse.json({ error: "Failed to fetch appointments", message: err.message }, { status: 500 });
      }
    }

    case EPIC.FHIR_ACTIONS.GET_CONDITIONS: {
      const accessToken = req.cookies.get("epic_token")?.value;

      if (!accessToken) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

      try {
        const patientId = req.nextUrl.searchParams.get("patient");
        if (!patientId) return NextResponse.json({ error: "Missing patient ID" }, { status: 400 });

        // 1. Build parameters based on the reference docs
        // We default to problem-list-item because that is the most reliable for self-created data
        const categoryParam = req.nextUrl.searchParams.get("category") || "problem-list-item";

        const params: Record<string, string> = {
          patient: patientId,
          category: categoryParam
        };

        // 2. Add clinical-status. Epic search often returns 0 results for 
        // new entries if the 'active' status isn't explicitly requested.
        params["clinical-status"] = "active";

        const searchUrl = EPIC_ENDPOINTS.FHIR.CONDITION_SEARCH(params);
        console.log('[GET_CONDITIONS] Fetching URL:', searchUrl);

        const fhirResponse = await fetch(searchUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/fhir+json"
          }
        });

        const rawText = await fhirResponse.text();

        let data = null;
        try {
          data = rawText ? JSON.parse(rawText) : null;
        } catch (e) {
          console.error("[GET_CONDITIONS] JSON Parse Error", e);
        }

        if (!fhirResponse.ok) {
          return NextResponse.json({ error: "FHIR request failed", details: data }, { status: fhirResponse.status });
        }

        // 3. Logic Check: If total is 0, Epic might have indexed it as a health-concern instead
        if (data?.total === 0 && categoryParam === "problem-list-item") {
          console.log("No Problem List items found, retrying with health-concern...");
          // You could optionally perform a second fetch here or return the 0 to the front-end
        }

        return NextResponse.json(data);

      } catch (err: any) {
        console.error('[GET_CONDITIONS] Catch Error:', err);
        return NextResponse.json({ error: "Failed to fetch conditions", message: err.message }, { status: 500 });
      }
    }

    case EPIC.FHIR_ACTIONS.GET_REPORTS: {
      const accessToken = req.cookies.get("epic_token")?.value;
      if (!accessToken) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
      try {
        const patientId = req.nextUrl.searchParams.get("patient");
        if (!patientId) return NextResponse.json({ error: "Missing patient ID" }, { status: 400 });
        const params: Record<string, string> = { patient: patientId };
        const category = req.nextUrl.searchParams.get("category");
        if (category) params["category"] = category;
        const fhirResponse = await fetch(EPIC_ENDPOINTS.FHIR.DIAGNOSTIC_REPORT_SEARCH(params), {
          headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/fhir+json" }
        });
        const data = await fhirResponse.text().then(t => t ? JSON.parse(t) : null).catch(() => null);
        if (!fhirResponse.ok) return NextResponse.json({ error: "FHIR request failed", details: data }, { status: fhirResponse.status });
        return NextResponse.json(data);
      } catch (err: any) {
        return NextResponse.json({ error: "Failed to fetch diagnostic reports", message: err.message }, { status: 500 });
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
          console.log("[CREATE_PATIENT] Raw text:", data);

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

        // As per Epic FHIR API, the location field in response usually returns the created patient ID.
        // E.g. data.location or via Location header.
        const locationHeader = fhirResponse.headers.get("location");
        let newPatientId = "";

        if (locationHeader) {
          if (locationHeader.startsWith("Patient/")) {
            newPatientId = locationHeader.replace("Patient/", "").split("/")[0];
          } else {
            const parts = locationHeader.split("/Patient/");
            if (parts.length > 1) {
              newPatientId = parts[1].split("/")[0];
            }
          }
        }

        if (!newPatientId && data?.location) {
          // Sometime it's in data.location depending on how it's parsed
          const parts = String(data.location).split("/Patient/");
          if (parts.length > 1) {
            newPatientId = parts[1].split("/")[0];
          } else {
            newPatientId = String(data.location);
          }
        }

        if (!newPatientId && data?.id) {
          newPatientId = data.id;
        }

        if (newPatientId) {
          try {
            const stmt = db.prepare('INSERT INTO patients (id) VALUES (?)');
            stmt.run(newPatientId);
            console.log(`[CREATE_PATIENT] Saved patient ID to DB: ${newPatientId}`);
          } catch (dbErr: any) {
            // Handle UNIQUE constraint failure gracefully (if we somehow double-create)
            if (dbErr.code !== 'SQLITE_CONSTRAINT_PRIMARYKEY') {
              console.error("[CREATE_PATIENT] Failed to save patient ID to local DB:", dbErr);
            }
          }
        } else {
          console.warn("[CREATE_PATIENT] Could not extract Patient ID from creation response. Data:", JSON.stringify(data).slice(0, 100));
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

    case EPIC.FHIR_ACTIONS.CREATE_CONDITION: {
      const accessToken = req.cookies.get("epic_token")?.value;

      if (!accessToken) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
      }

      try {
        const body = await req.json();
        const { patientId, codeText, sctCode } = body;

        if (!patientId || !codeText) {
          return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Build FHIR Condition resource to match Epic Documentation exactly
        const conditionResource: any = {
          resourceType: "Condition",
          clinicalStatus: {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
                version: "4.0.0",
                code: "active",
                display: "Active"
              }
            ],
            text: "Active"
          },
          verificationStatus: {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/condition-ver-status",
                version: "4.0.0",
                code: "provisional",
                display: "Provisional"
              }
            ],
            text: "Provisional"
          },
          category: [
            {
              coding: [
                {
                  system: "http://terminology.hl7.org/CodeSystem/condition-category",
                  code: "problem-list-item",
                  display: "Problem List Item",
                },
              ],
            },
          ],
          code: {
            coding: sctCode ? [
              {
                system: "http://snomed.info/sct",
                code: sctCode,
                display: codeText
              }
            ] : [],
            text: codeText
          },
          subject: {
            reference: `Patient/${patientId}`
          },
          // Epic documentation suggests providing an onset date
          onsetDateTime: new Date().toISOString().split('T')[0],
          note: [
            {
              text: "Condition added via API"
            }
          ]
        };

        const fhirResponse = await fetch(EPIC_ENDPOINTS.FHIR.CONDITION_CREATE, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/fhir+json",
            Accept: "application/fhir+json",
          },
          body: JSON.stringify(conditionResource),
        });

        // Extract Location header to help with the "Total 0" debug issue
        const locationHeader = fhirResponse.headers.get("Location");

        const rawText = await fhirResponse.text();
        let data;
        try {
          data = rawText ? JSON.parse(rawText) : { message: "Resource Created" };
        } catch (e) {
          data = { rawText };
        }

        if (!fhirResponse.ok) {
          console.dir(data, { depth: 4 });
          return NextResponse.json(
            { error: "Failed to create condition", details: data },
            { status: fhirResponse.status }
          );
        }

        // Return the location header so the frontend can verify the ID
        return NextResponse.json({ ...data, fhirId: locationHeader }, { status: 201 });

      } catch (err: any) {
        console.error("[CREATE_CONDITION] Error:", err);
        return NextResponse.json(
          { error: "Failed to create condition", message: err.message },
          { status: 500 }
        );
      }
    }

    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
}
