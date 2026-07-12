import { Request, Response, NextFunction } from "express";
import {
  ValidationError as SequelizeValidationError,
  UniqueConstraintError,
} from "sequelize";
import { ErrorLog, ErrorType } from "../models/errorLog.model";
import { redact } from "../utils/redact";

function classifyError(err: Error, statusCode: number): ErrorType {
  if (err instanceof SequelizeValidationError) return "validation";
  if (err instanceof UniqueConstraintError) return "database";
  if (statusCode === 400) return "validation";
  if (statusCode === 401 || statusCode === 403) return "auth";
  if (statusCode === 404) return "notfound";
  if (statusCode >= 500) return "server";
  return "server";
}

export const errorHandlerMiddleware = async (
  err: Error & { status?: number; statusCode?: number },
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const statusCode = err.status ?? err.statusCode ?? 500;

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
          // errorType: "server",
          errorType: classifyError(err, statusCode),
          errorMessage: err.message ?? "Unknown error",
          stackTrace: err.stack ?? null,
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
