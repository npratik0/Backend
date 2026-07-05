import { z } from "zod";

export const registerSchema = z.object({
  email: z.email("Invalid email"),
  fullName: z.string().min(1).max(100),
  phoneNumber: z.string().length(10, "Phone Number must br 10 digits long"),
  password: z
    .string()
    .min(8, "Password must be atleast 8 character long")
    .regex(/[A-Z]/, "Password must contain atleast one Uppercase letter")
    .regex(/[a-z]/, "Password must contain atleast one Lowercase letter")
    .regex(/[0-9]/, "Password must contain atleast one Number")
    .regex(
      /[^A-Za-z0-9]/,
      "Password must contain atleast one Special character",
    ),
  // confirmPassword: z.string()
});
// .refine((data)=> data.password === data.confirmPassword,{
//     message: "Passwords don't match",
//     path:["Confirm Password"]
// });

export const LoginSchema = z.object({
  email: z.string().min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Email is required"),
});

export const verifyEmailSchema = z.object({
  email: z.email("Invalid email"),
  otp: z.string().regex(/^\d{6}$/, "Code must be 6 digits"),
});

export const resendOtpSchema = z.object({
  email: z.email("Invalid email"),
  type: z.enum(["email_verification", "password_reset"]).optional(),
});

export const onboardingSchema = z.object({
  services: z.array(z.string()).min(1, "Select at least one service"),
  budget: z.string().min(1, "Budget is required"),
  timing: z.array(z.string()).min(1, "Select at least one time preference"),
});

export const resetPasswordSchema = z.object({
  email: z.string().min(1, "Email is required"),
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
  newPassword: z
    .string()
    .min(8, "Password must be atleast 8 character long")
    .regex(/[A-Z]/, "Password must contain atleast one Uppercase letter")
    .regex(/[a-z]/, "Password must contain atleast one Lowercase letter")
    .regex(/[0-9]/, "Password must contain atleast one Number")
    .regex(
      /[^A-Za-z0-9]/,
      "Password must contain atleast one Special character",
    ),
});
