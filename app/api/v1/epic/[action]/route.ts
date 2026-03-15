import { generatePKCE } from "@/app/utils/pkce";
import { EPIC } from "@/constant/server/epic";
import { getSmartConfig } from "@/app/utils/smartDiscovery";
import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/app/utils/verifyIdToken";

interface RouteParams {
  params: {
    action: string;
  };
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { action } = await params;

  switch (action) {
    case EPIC.OAUTH_ACTIONS.AUTHORIZE: {
      const { codeVerifier, codeChallenge } = generatePKCE();
      const state = crypto.randomUUID();
      const nonce = crypto.randomUUID();

      const smartConfig = await getSmartConfig(
        process.env.EPIC_FHIR_BASE!
      );

      const authorizationUrl = new URL(
        smartConfig.authorization_endpoint
      );

      authorizationUrl.searchParams.set("response_type", "code");
      authorizationUrl.searchParams.set(
        "client_id",
        process.env.EPIC_APP_CLIENT_ID!
      );
      authorizationUrl.searchParams.set(
        "redirect_uri",
        process.env.EPIC_APP_REDIRECT_URI!
      );
      authorizationUrl.searchParams.set(
        "scope",
        "launch openid profile fhirUser offline_access patient/Patient.read patient/MedicationRequest.read patient/Observation.read"
      );
      authorizationUrl.searchParams.set(
        "aud",
        process.env.EPIC_FHIR_BASE!
      );
      authorizationUrl.searchParams.set("state", state);
      authorizationUrl.searchParams.set("nonce", nonce);
      authorizationUrl.searchParams.set("code_challenge", codeChallenge);
      authorizationUrl.searchParams.set(
        "code_challenge_method",
        "S256"
      );

      const response = NextResponse.redirect(
        authorizationUrl.toString()
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

      response.cookies.set("oauth_nonce", nonce, {
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

      if (error) {
        return NextResponse.json({ error }, { status: 400 });
      }

      if (!code) {
        return NextResponse.json(
          { error: "Authorization code missing" },
          { status: 400 }
        );
      }

      const storedState = req.cookies.get("oauth_state")?.value;
      const codeVerifier = req.cookies.get("pkce_verifier")?.value;
      const storedNonce = req.cookies.get("oauth_nonce")?.value;

      if (!storedState || storedState !== returnedState) {
        return NextResponse.json(
          { error: "Invalid state parameter" },
          { status: 400 }
        );
      }

      if (!codeVerifier) {
        return NextResponse.json(
          { error: "Missing PKCE verifier" },
          { status: 400 }
        );
      }

      const smartConfig = await getSmartConfig(
        process.env.EPIC_FHIR_BASE!
      );

      const tokenResponse = await fetch(
        smartConfig.token_endpoint,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri:
              process.env.EPIC_APP_REDIRECT_URI!,
            client_id:
              process.env.EPIC_APP_CLIENT_ID!,
            code_verifier: codeVerifier,
          }),
        }
      );

      const tokenData = await tokenResponse.json();
      const patientId = tokenData.patient;

      console.log("Patient data", tokenData);

      if (!tokenResponse.ok) {
        return NextResponse.json(
          { error: "Token exchange failed", details: tokenData },
          { status: tokenResponse.status }
        );
      }

      if (tokenData.id_token) {
        const verifiedPayload = await verifyIdToken(
          tokenData.id_token,
          smartConfig.issuer,
          process.env.EPIC_APP_CLIENT_ID!,
          smartConfig.jwks_uri
        );

        if (verifiedPayload.nonce !== storedNonce) {
          return NextResponse.json(
            { error: "Invalid nonce" },
            { status: 400 }
          );
        }
      }

      const response = NextResponse.json({
        message: "Authentication successful",
      });

      response.cookies.delete("oauth_state");
      response.cookies.delete("pkce_verifier");
      response.cookies.delete("oauth_nonce");

      return response;
    }

    default:
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
  }
}