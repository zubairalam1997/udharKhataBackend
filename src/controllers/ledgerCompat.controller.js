import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import ledgerCompatService from "../services/ledgerCompat.service.js";

const requireUserId = (req) => {
  const userId = req.header("x-user-id");
  if (!userId) {
    throw new ApiError(401, "x-user-id header is required");
  }
  return userId;
};

const login = asyncHandler(async (req, res) => {
  const user = await ledgerCompatService.login(req.body?.name, req.body?.phone);
  return res.status(200).json({ user });
});

const getCustomers = asyncHandler(async (req, res) => {
  const userId = requireUserId(req);
  const customers = await ledgerCompatService.getCustomers(userId);
  return res.status(200).json({ customers });
});

const getCustomerById = asyncHandler(async (req, res) => {
  const userId = requireUserId(req);
  const customer = await ledgerCompatService.getCustomerById(userId, req.params.id);
  return res.status(200).json({ customer });
});

const createCustomer = asyncHandler(async (req, res) => {
  const userId = requireUserId(req);
  const customer = await ledgerCompatService.createCustomer(userId, req.body?.name, req.body?.phone);
  return res.status(201).json({ customer });
});

const getTransactions = asyncHandler(async (req, res) => {
  const userId = requireUserId(req);
  const transactions = await ledgerCompatService.getTransactions(userId, req.query?.customerId);
  return res.status(200).json({ transactions });
});

const createTransaction = asyncHandler(async (req, res) => {
  const userId = requireUserId(req);
  const result = await ledgerCompatService.createTransaction(userId, req.body);
  return res.status(201).json(result);
});

const getNotifications = asyncHandler(async (req, res) => {
  const userId = requireUserId(req);
  const notifications = await ledgerCompatService.getNotifications(userId);
  return res.status(200).json({ notifications });
});

const createNotification = asyncHandler(async (req, res) => {
  requireUserId(req);
  const notification = await ledgerCompatService.createNotification(req.body);
  return res.status(201).json({ notification });
});

const updateNotification = asyncHandler(async (req, res) => {
  const userId = requireUserId(req);
  const notification = await ledgerCompatService.updateNotification(
    userId,
    req.params.id,
    req.body?.status
  );
  console.log(" ledgerCompat.controller Updated notification:", notification);
  return res.status(200).json({ notification });
});

export {
  login,
  getCustomers,
  getCustomerById,
  createCustomer,
  getTransactions,
  createTransaction,
  getNotifications,
  createNotification,
  updateNotification,
};
