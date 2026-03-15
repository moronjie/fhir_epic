import { jwtVerify, createRemoteJWKSet } from "jose";

export async function verifyIdToken(
  idToken: string,
  issuer: string,
  audience: string,
  jwksUri: string
) {
  const JWKS = createRemoteJWKSet(new URL(jwksUri));

  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer,
    audience,
  });

  return payload;
}