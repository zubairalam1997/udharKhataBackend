import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import  AuthService from "../services/auth.service.js";

// cookies for web
const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 90 * 24 * 60 * 60 * 1000 
};

const sendOTP = asyncHandler(async(req,res) => {
    const {phoneNumber} = req.body;

    if(!phoneNumber || !/^[6-9]\d{9}$/.test(phoneNumber)){
        throw new ApiError(400, "Valid 10-digit phone number required");
    }
    const result = await AuthService.sendOTP(phoneNumber);
    
    return res.status(200).json(
        new ApiResponse(200, result, "OTP sent successfully")
    );
});

const verifyOTP = asyncHandler(async(req, res) => {
    const {phoneNumber, otp, name,} = req.body;

    if(!phoneNumber || !name || !otp){
        throw new ApiError(400, "Phone number, name, and OTP required");
    }

    const result = await AuthService.verifyOTP(phoneNumber,  otp, name );

    res.cookie('accessToken', result.accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
    res.cookie('refreshToken', result.refreshToken, cookieOptions);

    return res.status(200).json(
        new ApiResponse(200, result, result.isNewUser ? 'Account Created' : 'Login Successful')
    );
});

const updateProfile = asyncHandler(async(req, res)=> {
    const user = await AuthService.updateProfile(req.user.id, req.body);

    return res.status(200).json(
        new ApiResponse(200, user, "Profile updated successfully")
    );
});

const getCurrentUser = asyncHandler(async(req,res)=>{
    return res.status(200).json(
        new ApiResponse(200, req.user, "User fetched successfully")
    );
});

const logout = asyncHandler(async (req, res) => {

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    return res.status(200).json(
        new ApiResponse(200, {}, "Logged out successfully")
    );
});

export {
    sendOTP,
    verifyOTP,
    updateProfile,
    getCurrentUser,
    logout
};