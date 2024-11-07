import { prismaClient } from "../../clients/db";
import { GraphqlContext } from "../../interfaces";
import JWTService from "../../services/JWTService";
import axios from "axios";

interface GoogleJwtPayload {
    iss: string;
    azp: string;
    aud: string;
    sub: string;
    email: string;
    email_verified: string;
    nbf: string;
    name: string;
    picture: string;
    given_name: string;
    family_name: string;
    iat: string;
    exp: string;
    jti: string;
    alg: string;
    kid: string;
    typ: string;
}

const mutations = {
    loginWithGoogle: async (parent: any, { token }: { token: string }, ctx: GraphqlContext) => {
        try {
            const googleOauthURL = new URL("https://oauth2.googleapis.com/tokeninfo");
            googleOauthURL.searchParams.set('id_token', token);

            const { data } = await axios.get<GoogleJwtPayload>(googleOauthURL.toString(), {
                responseType: 'json'
            });

            console.log("data", data);

            // Check if the email is verified
            if (!data.email_verified) {
                throw new Error("Email not verified by Google.");
            }

            let user = await prismaClient.user.findUnique({ where: { email: data.email } });

            if (!user) {
                user = await prismaClient.user.create({
                    data: {
                        username: data.email.split("@")[0],
                        fullName: data.family_name || data.given_name,
                        email: data.email,
                        profileImageURL: data.picture,
                        isVerified: true,
                    }
                });
            }

            const userToken = JWTService.generateTokenForUser(user);

            ctx.res.cookie("__mellowMoments_token", userToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: 'strict',
                maxAge: 24 * 60 * 60 * 1000 // 1 day
            });

            return user
        } catch (error: any) {
            throw new Error(error.message);
        }
    }
}

export const resolvers = { mutations }