import { Session } from "../models/session.model";

// get all active sessions for current user
export const getSessions = async (req: any, res: any) => {
  try {
    const userId = req.user.userId;

    const sessions = await Session.findAll({
      where: { userId },
      attributes: ["id", "ip", "device", "createdAt", "expiresAt"],
    });

    return res.status(200).json({ sessions });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// revoke a specific session
export const revokeSession = async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
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