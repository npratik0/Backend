export const authorize = (...allowedRoles: string[]) => {
  return (req: any, res: any, next: any) => {
    const role = req.user?.role;

    if (!role) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    next();
  };
};