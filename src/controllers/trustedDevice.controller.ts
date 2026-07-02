import { Request, Response } from "express";
import { TrustedDevice } from "../models/trustedDevice.model";
import { DeviceInfo } from "../models/deviceInfo.model";

export const getTrustedDevices = async (req: Request, res: Response) => {
  try {
    const devices = await TrustedDevice.findAll({
      where: { userId: req.auth!.userId },
      include: [{ model: DeviceInfo }],
      order: [["lastSeenAt", "DESC"]],
    });
    return res.json({ devices });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const removeTrustedDevice = async (req: Request, res: Response) => {
  try {
    const device = await TrustedDevice.findOne({
      where: { id: req.params.id, userId: req.auth!.userId },
    });
    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }
    await device.destroy();
    return res.json({ message: "Trusted device removed" });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
