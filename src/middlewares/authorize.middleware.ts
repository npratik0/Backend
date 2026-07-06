import { Request, Response, NextFunction } from "express";

export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.auth?.role;

    if (!role) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    next();
  };
};
