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

// PUBLIC: No verifyJWT here!
router.post('/send-otp', validate(sendOTPSchema), sendOTP);
router.post('/verify-otp', validate(verifyOTPSchema), verifyOTP);
router.post('/login', validate(verifyOTPSchema), verifyOTP); // Use verifyOTP as the controller

// PROTECTED: Use verifyJWT here
router.get('/me', verifyJWT, getCurrentUser);
router.patch('/profile', verifyJWT, updateProfile);

// restricted routes
// router.patch('/profile', verifyJWT, validate(updateProfileSchema), updateProfile);
// router.get('/me', verifyJWT, getCurrentUser);
router.get('/logout',verifyJWT, logout);

export default router;

