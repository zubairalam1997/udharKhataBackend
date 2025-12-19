import {Router} from "express";
import { sendOTP, verifyOTP, updateProfile, getCurrentUser, logout } from "../controllers/auth.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// public routes
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);

// restricted routes
router.patch('/profile', verifyJWT, updateProfile);
router.get('/me', verifyJWT, getCurrentUser);
router.get('/logout',verifyJWT, logout);

export default router;

