// import {User} from '../models/user.model';
// import {Request, Response} from 'express';

// export const getAllUsers = async (req: Request, res: Response) => {
//     try{
//         const users = await User.findAll({
//             attributes:  {exclude: ['password', 'refreshToken']}
//         })
//         res.status(200).json({
//             users,
//             message: "Users retrieved successfully"
//         })
//     }catch (error){
//         res.status(500).json({
//             message: "Internal Server Error"
//         })
//     }
// }

// export const getUserById = async( req: any, res: Response) => {
//     try{
//         const userId = parseInt(req.params.id);
//         const user = await User.findByPk(userId,{
//             attributes: {exclude: ['password', 'refreshToken']}
//         })
//         if(!user){
//             return res.status(404).json({
//                 message: "User not found"
//             })
//         }
//         res.status(200).json({
//             user,
//             message: "User retrieved successfully"
//         })

//     }catch(error){
//         res.status(500).json({
//             message: "Internal Server Error"
//         })
//     }
// }

import { NextFunction, Request, Response } from "express";
import { User } from "../models/user.model";

export const getAllUsers = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ["password", "refreshToken"] },
    });

    return res.status(200).json({ users });
  } catch (error) {
    // return res.status(500).json({ message: 'Internal Server Error' });
    next(error);
  }
};

export const updateUserRole = async (
  req: Request<{ id: string }, { role: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.auth) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const { id } = req.params;
    const { role } = req.body;

    if (!["user", "admin", "superadmin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "superadmin" && req.auth.role !== "superadmin") {
      return res.status(403).json({ message: "Cannot modify a superadmin" });
    }

    await user.update({ role });

    return res.status(200).json({
      message: `Role updated to ${role}`,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (error) {
    // return res.status(500).json({ message: 'Internal Server Error' });
    next(error);
  }
};

export const deleteUser = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "superadmin") {
      return res.status(403).json({ message: "Cannot delete a superadmin" });
    }

    await user.destroy();

    return res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    // return res.status(500).json({ message: 'Internal Server Error' });
    next(error);
  }
};
