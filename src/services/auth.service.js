import jwt from "jsonwebtoken";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import prisma from "../db/db.config.js";
import { ApiError } from "../utils/ApiError.js";


class AuthService{
    //TODO: add sessions
    // generateAccessToken(userId){
    //     return jwt.sign(
    //         {
    //             id: userId,
    //             type: "access",
    //             jti: uuidv4()
    //         },
    //         process.env.JWT_SECRET,
    //         {
    //         expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    //         algorithm: 'HS256'
    //         }
    //     );
    // }
    generateAccessToken(userId) {
    const secret = process.env.JWT_SECRET;
    
    if (!secret) {
        console.error("❌ CRITICAL: JWT_SECRET is missing from .env file!");
        throw new Error("Internal Server Error: Secret not configured");
    }

    return jwt.sign(
        { id: userId, type: "access", jti: uuidv4() },
        secret,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '1d',
            algorithm: 'HS256'
        }
    );
}
    generateRefreshToken(userId){
        return jwt.sign(
            {id: userId},
            process.env.JWT_SECRET,
            {expiresIn: process.env.JWT_EXPIRES_IN || '30d'}
        );
    }

    

    //send otp
    async sendOTP(phoneNumber){
        // TODO: Integrate sms provider in production
        const mockOTP = process.env.NODE_ENV === 'development'?'123456' : null;

        // store otp in cache(redis-in production)
        if(!global.otpStore){
            global.otpStore = {};
        }
        global.otpStore[phoneNumber] = {
            otp: mockOTP || Math.floor(100000 + Math.random()*900000).toString(),
            expiresAt: new Date(Date.now()+10*60*1000)           
        };
        return {
            success: true,
            message: "OTP sent successfully",
            ...(mockOTP && {otp: mockOTP}) // TODO: remove in production
        };
    }

   async verifyOTP(phoneNumber, otp, name) {
    const stored = global.otpStore?.[phoneNumber];
    
    // 1. Define the development bypass
    const isDevMock = process.env.NODE_ENV === 'development' && otp === '123456';

    // 2. Only throw error if it's NOT the mock OTP AND (store is empty or otp mismatches)
    if (!isDevMock && (!stored || stored.otp !== otp)) {
        throw new ApiError(400, "Invalid OTP");
    }

    // 3. Skip expiration check for mock OTP
    if (!isDevMock && stored && new Date() > stored.expiresAt) {
        delete global.otpStore[phoneNumber];
        throw new ApiError(400, "OTP expired");
    }

    // clear otp if it existed
    if (stored) delete global.otpStore[phoneNumber];

    // find or create user (Rest of your code remains the same)
    let user = await prisma.user.findUnique({
        where: { phoneNumber }
    });

    const isNewUser = !user;

    if (!user) {
        user = await prisma.user.create({
            data: { phoneNumber,
                    displayName: name
             } 
        });
    }

    const accessToken = this.generateAccessToken(user.id);
    const refreshToken = this.generateAccessToken(user.id);

    return {
        user: {
            id: user.id,
            phoneNumber: user.phoneNumber,
            userType: user.userType,
            displayName: user.displayName,
            businessName: user.businessName
        },
        accessToken,
        refreshToken,
        isNewUser
    };
}
    // complete profile after first login
    async updateProfile(userId, data){
        const {userType, displayName, businessName, gstIn } = data;

        const updateData = {userType};

        if(userType === "PERSONAL"){
            if(!displayName) throw new ApiError(400, "Display name required");
            updateData.displayName = displayName;
        }else if(userType === "BUSINESS"){
            if(!businessName) throw new ApiError(400, "Business name required");
            updateData.businessName = businessName;
            updateData.gstIn = gstIn;
        }

        const user = await prisma.user.update({
            where:{id: userId},
            data: updateData,
            select:{
                id: true,
                phoneNumber: true,
                userType: true,
                displayName: true,
                businessName: true,
                gstIn: true,
            }
        });
        return user;
    }
}

export default new AuthService();