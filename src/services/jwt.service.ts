import jwt from "jsonwebtoken";

export function createJwt(payload: any) {
  const secret = process.env.JWT_SECRET;
  const expires = process.env.JWT_EXPIRES || "1h";

  if (!secret) {
    throw new Error("JWT_SECRET is not defined in environment");
  }

  return jwt.sign(payload, secret, {
    expiresIn: expires,
  });
}
