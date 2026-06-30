// // import { Request, Response, NextFunction } from "express";
// // import jwt from "jsonwebtoken";
// // import { DeviceInfo } from "../models/deviceInfo.model";
// // import { RequestLog } from "../models/requestLog.model";
// // import { redact } from "../utils/redact";
// // import { parseDevice, getLocation, normalizeIp } from "../utils/device";

// // const SKIP_PATHS = ["/health", "/favicon.ico", "/_next"];

// // export const requestLogMiddleware = (
// //   req: Request,
// //   res: Response,
// //   next: NextFunction,
// // ) => {
// //   const startTime = Date.now();

// //   if (SKIP_PATHS.some((p) => req.path.startsWith(p))) {
// //     return next();
// //   }

// //   const originalJson = res.json.bind(res);
// //   let responseBody: object | null = null;

// //   res.json = (body: unknown) => {
// //     responseBody = redact(body) as object;
// //     return originalJson(body);
// //   };

// //   // Run after response is sent — never blocks the response
// //   res.on("finish", () => {
// //     setImmediate(async () => {
// //       try {
// //         const responseTimeMs = Date.now() - startTime;
// //         const ip = normalizeIp(req.ip);
// //         const userAgent = req.headers["user-agent"] ?? "";

// //         // Extract userId from JWT if present (best-effort — don't fail if missing)
// //         let userId: number | null = null;
// //         const authHeader = req.headers.authorization;
// //         if (authHeader?.startsWith("Bearer ")) {
// //           try {
// //             const decoded = jwt.verify(
// //               authHeader.split(" ")[1],
// //               process.env.JWT_SECRET!,
// //             ) as { userId: number };
// //             userId = decoded.userId;
// //           } catch {
// //             /* token invalid or expired — ignore */
// //           }
// //         }

// //         // Parse device info and get location
// //         const parsed = parseDevice(userAgent);
// //         const location = getLocation(ip);

// //         // Create DeviceInfo row
// //         const deviceInfo = await DeviceInfo.create({
// //           ip,
// //           device: parsed.device,
// //           browser: parsed.browser,
// //           browserVersion: parsed.browserVersion,
// //           os: parsed.os,
// //           osVersion: parsed.osVersion,
// //           country: location.country,
// //           city: location.city,
// //           fingerprint: parsed.fingerprint,
// //           userAgent,
// //         });

// //         // Create RequestLog row
// //         await RequestLog.create({
// //           userId,
// //           deviceInfoId: deviceInfo.id,
// //           method: req.method,
// //           endpoint: req.path,
// //           statusCode: res.statusCode,
// //           responseTimeMs,
// //           requestBody: redact(req.body) as object,
// //           responseBody,
// //         });
// //       } catch (err) {
// //         // Logging must NEVER crash the app — silently fail
// //         console.error("[RequestLog] Failed to log request:", err);
// //       }
// //     });
// //   });

// //   next();
// // };

// import { Request, Response, NextFunction } from "express";
// import jwt from "jsonwebtoken";
// import { DeviceInfo } from "../models/deviceInfo.model";
// import { RequestLog } from "../models/requestLog.model";
// import { ErrorLog } from "../models/errorLog.model";
// import { redact } from "../utils/redact";
// import { parseDevice, getLocation, normalizeIp } from "../utils/device";

// const SKIP_PATHS = [
//   "/health",
//   "/favicon.ico",
//   "/_next",
//   "/request-logs",
//   "/errors",
//   "/analytics",
// ];

// export const requestLogMiddleware = (
//   req: Request,
//   res: Response,
//   next: NextFunction,
// ) => {
//   const startTime = Date.now();

//   if (SKIP_PATHS.some((p) => req.path.startsWith(p))) return next();

//   // Intercept res.json to capture response body
//   const originalJson = res.json.bind(res);
//   let responseBody: object | null = null;

//   res.json = (body: unknown) => {
//     responseBody = redact(body) as object;
//     return originalJson(body);
//   };

//   res.on("finish", () => {
//     setImmediate(async () => {
//       try {
//         const responseTimeMs = Date.now() - startTime;
//         const ip = normalizeIp(req.ip);
//         const userAgent = req.headers["user-agent"] ?? "";

//         // Extract userId from JWT (best-effort)
//         let userId: number | null = null;
//         const authHeader = req.headers.authorization;
//         if (authHeader?.startsWith("Bearer ")) {
//           try {
//             const decoded = jwt.verify(
//               authHeader.split(" ")[1],
//               process.env.JWT_SECRET!,
//             ) as { userId: number };
//             userId = decoded.userId;
//           } catch {
//             /* ignore */
//           }
//         }

//         const parsed = parseDevice(userAgent);
//         const location = getLocation(ip);

//         const deviceInfo = await DeviceInfo.create({
//           ip,
//           device: parsed.device,
//           browser: parsed.browser,
//           browserVersion: parsed.browserVersion,
//           os: parsed.os,
//           osVersion: parsed.osVersion,
//           country: location.country,
//           city: location.city,
//           fingerprint: parsed.fingerprint,
//           userAgent,
//         });

//         // Create RequestLog row
//         const requestLog = await RequestLog.create({
//           userId,
//           deviceInfoId: deviceInfo.id,
//           method: req.method,
//           endpoint: req.path,
//           statusCode: res.statusCode,
//           responseTimeMs,
//           requestBody: redact(req.body) as object,
//           responseBody,
//         });

//         // ── Log ALL 4xx and 5xx errors here ──────────────────────────────────
//         if (res.statusCode >= 400) {
//           const errorMessage =
//             ((responseBody as Record<string, unknown>)?.message as string) ??
//             `HTTP ${res.statusCode}`;

//           // Classify error type from status code
//           const errorType =
//             res.statusCode === 400
//               ? "validation"
//               : res.statusCode === 401 || res.statusCode === 403
//                 ? "auth"
//                 : res.statusCode === 404
//                   ? "notfound"
//                   : res.statusCode >= 500
//                     ? "server"
//                     : "server";

//           await ErrorLog.create({
//             requestLogId: requestLog.id,
//             userId,
//             endpoint: req.path,
//             method: req.method,
//             errorType,
//             errorMessage,
//             stackTrace: null, // no stack trace for expected errors
//             statusCode: res.statusCode,
//             requestBody: redact(req.body) as object,
//             resolved: false,
//           });
//         }
//       } catch (err) {
//         console.error("[RequestLog] Failed to log request:", err);
//       }
//     });
//   });

//   next();
// };

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { DeviceInfo } from "../models/deviceInfo.model";
import { RequestLog } from "../models/requestLog.model";
import { ErrorLog } from "../models/errorLog.model";
import { redact } from "../utils/redact";
import { parseDevice, getLocation, normalizeIp } from "../utils/device";

const SKIP_PATHS = [
  "/health",
  "/favicon.ico",
  "/_next",
  "/request-logs",
  "/errors",
  "/analytics",
  "/endpoints",
  "/system",
  "/overview",
  "/slow-endpoints",
];

// HARD GUARD (prevents recursive logging even if SKIP fails)
const isSkippable = (path: string) => {
  return SKIP_PATHS.some((p) => path.startsWith(p));
};

// Prevent DB explosion
const MAX_BODY_SIZE = 50_000; // characters

function safeSerialize(body: any) {
  try {
    const str = JSON.stringify(body);

    if (str.length > MAX_BODY_SIZE) {
      return {
        truncated: true,
        size: str.length,
        preview: str.slice(0, 5000),
      };
    }

    return body;
  } catch {
    return { error: "unserializable_body" };
  }
}

export const requestLogMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const startTime = Date.now();

  // skip noisy/system endpoints
  if (isSkippable(req.path)) return next();

  const originalJson = res.json.bind(res);
  let responseBody: any = null;

  // capture response safely
  res.json = (body: any) => {
    responseBody = body;
    return originalJson(body);
  };

  res.on("finish", () => {
    setImmediate(async () => {
      try {
        const responseTimeMs = Date.now() - startTime;

        const ip = normalizeIp(req.ip);
        const userAgent = req.headers["user-agent"] ?? "";

        // -----------------------------
        // JWT decode (best-effort)
        // -----------------------------
        let userId: number | null = null;
        const authHeader = req.headers.authorization;

        if (authHeader?.startsWith("Bearer ")) {
          try {
            const decoded = jwt.verify(
              authHeader.split(" ")[1],
              process.env.JWT_SECRET!,
            ) as { userId: number };

            userId = decoded.userId;
          } catch {
            // ignore invalid token
          }
        }

        const parsed = parseDevice(userAgent);
        const location = getLocation(ip);

        // -----------------------------
        // DeviceInfo (FIXED: avoid duplicates)
        // -----------------------------
        let deviceInfo = await DeviceInfo.findOne({
          where: {
            ip,
            fingerprint: parsed.fingerprint,
          },
        });

        if (!deviceInfo) {
          deviceInfo = await DeviceInfo.create({
            ip,
            device: parsed.device,
            browser: parsed.browser,
            browserVersion: parsed.browserVersion,
            os: parsed.os,
            osVersion: parsed.osVersion,
            country: location.country,
            city: location.city,
            fingerprint: parsed.fingerprint,
            userAgent,
          });
        }

        // -----------------------------
        // SAFE RESPONSE BODY
        // -----------------------------
        const safeResponse = safeSerialize(redact(responseBody));

        // -----------------------------
        // REQUEST LOG
        // -----------------------------
        const requestLog = await RequestLog.create({
          userId,
          deviceInfoId: deviceInfo.id,
          method: req.method,
          endpoint: req.path,
          statusCode: res.statusCode,
          responseTimeMs,
          requestBody: safeSerialize(redact(req.body)),
          responseBody: safeResponse,
        });

        // -----------------------------
        // ERROR LOGGING (4xx + 5xx)
        // -----------------------------
        if (res.statusCode >= 400) {
          const errorMessage =
            (responseBody as any)?.message || `HTTP ${res.statusCode}`;

          const errorType =
            res.statusCode === 400
              ? "validation"
              : res.statusCode === 401 || res.statusCode === 403
                ? "auth"
                : res.statusCode === 404
                  ? "notfound"
                  : "server";

          await ErrorLog.create({
            requestLogId: requestLog.id,
            userId,
            endpoint: req.path,
            method: req.method,
            errorType,
            errorMessage,
            stackTrace: null,
            statusCode: res.statusCode,
            requestBody: safeSerialize(redact(req.body)),
            resolved: false,
          });
        }
      } catch (err) {
        console.error("[RequestLog] Failed to log request:", err);
      }
    });
  });

  next();
};
