import { Op } from "sequelize";
import { DeviceInfo } from "../models/deviceInfo.model";
import { Session } from "../models/session.model";
import { NextFunction, Request, Response } from "express";

// export const getSessions = async (req: Request, res: Response) => {
//   try {
//     if(!req.auth){
//       return res.status(401).json({
//         message: "Unauthorized"
//       })
//     }

//     const userId = req.auth.userId;

//     const sessions = await Session.findAll({
//       where: { userId },
//       attributes: ["id", "ip", "device", "createdAt", "expiresAt"],
//     });

//     return res.status(200).json({ sessions });
//   } catch (error) {
//     return res.status(500).json({ message: "Internal Server Error" });
//   }
// };

export const getSessions = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.auth) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const sessions = await Session.findAll({
      where: {
        userId: req.auth.userId,
        status: "active",
        expiresAt: { [Op.gt]: new Date() },
      },
      include: [
        {
          model: DeviceInfo,
          attributes: ["ip", "device", "browser", "os", "city", "country"],
        },
      ],
      attributes: ["id", "status", "lastActiveAt", "createdAt", "expiresAt"],
      order: [["createdAt", "DESC"]],
    });

    return res.json({ sessions });
  } catch (error) {
    next(error);
  }
};

export const revokeSession = async (req: Request, res: Response) => {
  try {
    if (!req.auth) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const userId = req.auth.userId;
    const { sessionId } = req.params;

    const session = await Session.findOne({
      where: { id: sessionId, userId }, // ensure user owns this session
    });

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    await session.destroy();

    return res.status(200).json({ message: "Session revoked" });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
