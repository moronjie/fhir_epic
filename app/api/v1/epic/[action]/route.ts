import { generatePKCE } from "@/app/utils/pkce";
import { EPIC, EPIC_ENDPOINTS } from "@/constant/server/epic";
import { NextRequest, NextResponse } from "next/server";

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

      console.log("[AUTHORIZE] Starting OAuth flow");
      console.log("[AUTHORIZE] Client ID:", process.env.EPIC_APP_CLIENT_ID);
      console.log("[AUTHORIZE] Redirect URI:", process.env.EPIC_APP_REDIRECT_URI);
      console.log("[AUTHORIZE] FHIR Base:", process.env.EPIC_FHIR_BASE);

      // Store verifier and state in cookies (required for validation)
      const response = NextResponse.redirect(
        EPIC_ENDPOINTS.OAUTH.AUTHORIZE({
          response_type: "code",
          client_id: process.env.EPIC_APP_CLIENT_ID,
          redirect_uri: process.env.EPIC_APP_REDIRECT_URI,
          scope: "launch openid profile fhirUser offline_access patient/*.read",
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
      console.log("[REDIRECT] Code:", code ? "present" : "missing");
      console.log("[REDIRECT] State:", returnedState);
      console.log("[REDIRECT] Error:", error);

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

      console.log("[REDIRECT] Stored state:", storedState);
      console.log("[REDIRECT] Code verifier:", codeVerifier ? "present" : "missing");

      if (!storedState || storedState !== returnedState) {
        console.error("[REDIRECT] State mismatch!");
        return NextResponse.json(
          { 
            error: "Invalid state parameter",
            stored: storedState,
            received: returnedState
          },
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
        }),
      });

      const tokenData = await tokenResponse.json();

      console.log("[REDIRECT] Token response status:", tokenResponse.status);
      console.log("[REDIRECT] Token data:", tokenData);

      if (!tokenResponse.ok) {
        return NextResponse.json(
          { error: "Token exchange failed", details: tokenData },
          { status: tokenResponse.status },
        );
      }

      // Clear cookies after successful authentication
      const response = NextResponse.json(tokenData);
      response.cookies.delete("oauth_state");
      response.cookies.delete("pkce_verifier");

      return response;
    }
    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
}
