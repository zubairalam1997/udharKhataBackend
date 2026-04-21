import { Router } from "express";
import {
  login,
  getCustomers,
  getCustomerById,
  createCustomer,
  getTransactions,
  createTransaction,
  getNotifications,
  createNotification,
  updateNotification,
} from "../controllers/ledgerCompat.controller.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

router.post("/auth/login", login);

router.get("/customers", getCustomers);
router.get("/customers/:id", getCustomerById);
router.post("/customers", createCustomer);

router.get("/transactions", getTransactions);
router.post("/transactions", createTransaction);

router.get("/notifications", getNotifications);
router.post("/notifications", createNotification);
router.patch("/notifications/:id", updateNotification);

export default router;
