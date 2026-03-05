import { SignJWT } from "jose";
import { createPrivateKey } from "crypto";
import fs from "fs";

async function createClientAssertion() {
  const privateKeyPem = fs.readFileSync("./app/utils/keys/private.pem", "utf8");

  const privateKey = createPrivateKey(privateKeyPem);

  const jwt = await new SignJWT({})
    .setProtectedHeader({
      alg: "RS384",
      ...(process.env.EPIC_JWK_KID && { kid: process.env.EPIC_JWK_KID }),
    })
    .setIssuer(process.env.EPIC_APP_CLIENT_ID!)
    .setSubject(process.env.EPIC_APP_CLIENT_ID!)
    .setAudience("https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token")
    .setJti(crypto.randomUUID())
    .setIssuedAt(Math.floor(Date.now() / 1000))
    .setNotBefore(Math.floor(Date.now() / 1000))
    .setExpirationTime("5m")
    .sign(privateKey);

  return jwt;
}

export default createClientAssertion;
