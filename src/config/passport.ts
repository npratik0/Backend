import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { User } from "../models/user.model";
import dotenv from "dotenv";

dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0].value;
        const fullName = profile.displayName;
        const googleId = profile.id;

        if (!email) {
          return done(new Error("No email from Google"), undefined);
        }

        let user = await User.findOne({ where: { googleId } });
        if (user) {
          return done(null, user);
        }

        user = await User.findOne({ where: { email } });
        if (user) {
          await user.update({ googleId, isVerified: true });
          return done(null, user);
        }

        user = await User.create({
          fullName,
          email,
          googleId,
          role: "user",
          password: null,
          phoneNumber: null,
          isVerified: true,
        });

        return done(null, user);
      } catch (error) {
        return done(error, undefined);
      }
    }
  )
);

export default passport;