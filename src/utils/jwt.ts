// import jwt from "jsonwebtoken";

// export const generateToken = (userId: number) => {
//   return jwt.sign(
//     { userId },
//     process.env.JWT_SECRET!,
//     { expiresIn: process.env.JWT_EXPIRES_IN || "15m" }
//   );
// };

import jwt from "jsonwebtoken";

const secret = process.env.JWT_SECRET;
const refreshSecret = process.env.JWT_REFRESH_SECRET;

if (!secret) {
  throw new Error("JWT_SECRET is not defined in .env");
}
if (!refreshSecret) {
  throw new Error("JWT_REFRESH_SECRET is not defined in .env");
}

export const generateToken = (userId: number, role: string) => {
  return jwt.sign(
    { userId, role },
    secret,
    {
      expiresIn: "60m",
    }
  );
};

export const generateRefreshToken = (userId: number, role: string) => {
  return jwt.sign(
    { userId, role },
    refreshSecret,
    {
      expiresIn: "7d",
    }
  );
};
