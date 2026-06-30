import { Request, Response, NextFunction } from "express";
import {
  ValidationError as SequelizeValidationError,
  UniqueConstraintError,
} from "sequelize";
import { ErrorLog, ErrorType } from "../models/errorLog.model";
import { RequestLog } from "../models/requestLog.model";
import { redact } from "../utils/redact";
import { Op } from "sequelize";

// ─── Determine error type from status code or error class ────────────────────
function classifyError(err: Error, statusCode: number): ErrorType {
  if (err instanceof SequelizeValidationError) return "validation";
  if (err instanceof UniqueConstraintError) return "database";
  if (statusCode === 400) return "validation";
  if (statusCode === 401 || statusCode === 403) return "auth";
  if (statusCode === 404) return "notfound";
  if (statusCode >= 500) return "server";
  return "server";
}

// export const errorHandlerMiddleware = async (
//   err: Error & { status?: number; statusCode?: number },
//   req: Request,
//   res: Response,
//   _next: NextFunction,
// ) => {
//   const statusCode = err.status ?? err.statusCode ?? 500;
//   const errorType = classifyError(err, statusCode);

//   // Try to find the matching RequestLog row for this request
//   // Match by endpoint + method + recent time window (last 5 seconds)
//   let requestLogId: number | null = null;
//   try {
//     const recentLog = await RequestLog.findOne({
//       where: {
//         endpoint: req.path,
//         method: req.method,
//         createdAt: { [Op.gte]: new Date(Date.now() - 5000) },
//       },
//       order: [["createdAt", "DESC"]],
//     });
//     requestLogId = recentLog?.id ?? null;
//   } catch {
//     /* non-critical */
//   }

//   // Extract userId from res.locals (set by authenticate middleware)
//   const userId =
//     (req as Request & { auth?: { userId: number } }).auth?.userId ?? null;

//   // Write to ErrorLog asynchronously
//   setImmediate(async () => {
//     try {
//       await ErrorLog.create({
//         requestLogId,
//         userId,
//         endpoint: req.path,
//         method: req.method,
//         errorType,
//         errorMessage: err.message ?? "Unknown error",
//         stackTrace: process.env.NODE_ENV === "production" ? null : err.stack,
//         statusCode,
//         requestBody: redact(req.body) as object,
//         resolved: false,
//       });
//     } catch (logErr) {
//       console.error("[ErrorLog] Failed to log error:", logErr);
//     }
//   });

//   // Log to console in development
//   if (process.env.NODE_ENV !== "production") {
//     console.error(`[${req.method}] ${req.path} → ${statusCode}:`, err.message);
//   }

//   // Standard error response
//   return res.status(statusCode).json({
//     message: statusCode >= 500 ? "Internal Server Error" : err.message,
//     ...(process.env.NODE_ENV !== "production" && statusCode >= 500
//       ? { stack: err.stack }
//       : {}),
//   });
// };

// errorHandler.middleware.ts — simplified
export const errorHandlerMiddleware = async (
  err: Error & { status?: number; statusCode?: number },
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const statusCode = err.status ?? err.statusCode ?? 500;

  // Only log 5xx here — the request log middleware already logged 4xx
  // The value of the error handler is the STACK TRACE it captures
  if (statusCode >= 500) {
    setImmediate(async () => {
      try {
        await ErrorLog.create({
          requestLogId: null,
          userId:
            (req as Request & { auth?: { userId: number } }).auth?.userId ??
            null,
          endpoint: req.path,
          method: req.method,
          errorType: "server",
          errorMessage: err.message ?? "Unknown error",
          stackTrace: err.stack ?? null, // ← stack trace only available here
          statusCode,
          requestBody: redact(req.body) as object,
          resolved: false,
        });
      } catch (logErr) {
        console.error("[ErrorLog] Failed to log error:", logErr);
      }
    });
  }

  return res.status(statusCode).json({
    message: statusCode >= 500 ? "Internal Server Error" : err.message,
  });
};
