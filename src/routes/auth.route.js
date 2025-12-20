import {Router} from "express";
import { sendOTP, verifyOTP, updateProfile, getCurrentUser, logout } from "../controllers/auth.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { 
    sendOTPSchema,
    verifyOTPSchema,
    updateProfileSchema
 } from "../validators/auth.validator.js";

const router = Router();

// public routes
router.post('/send-otp', validate(sendOTPSchema), sendOTP);
router.post('/verify-otp', validate(verifyOTPSchema), verifyOTP);

// restricted routes
router.patch('/profile', verifyJWT, validate(updateProfileSchema), updateProfile);
router.get('/me', verifyJWT, getCurrentUser);
router.get('/logout',verifyJWT, logout);

export default router;

