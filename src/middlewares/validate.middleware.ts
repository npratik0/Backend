import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const issue = result.error.issues[0]; 

      return res.status(400).json({
        message: "Validation failed",
        error: {
          field: issue.path.join("."),
          message: issue.message,
        },
      });
    }
    req.body = result.data;
    next();
  };
};