import jwt from "jsonwebtoken";
import prisma from "../db/db.config.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const verifyJWT = asyncHandler(async(req,res,next) => {
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

    if(!token){
        throw new ApiError(401, "Unauthorized request");
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await prisma.user.findUnique({
            where:{
                id: decoded.id
            },
            select:{
                id: true,
                phoneNumber: true,
                email: true,
                userType: true,
                displayName: true,
                businessName: true

            }
        });
        if(!user){
            throw new ApiError(401, "Invalid access token");
        }

        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token")
    }
})