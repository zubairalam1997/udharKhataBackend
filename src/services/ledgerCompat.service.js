import prisma from "../db/db.config.js";
import { randomUUID } from "crypto";
import { ApiError } from "../utils/ApiError.js";
import TransactionService from "./transaction.service.js";

const toDateOnly = (value) => new Date(value).toISOString().slice(0, 10);

class LedgerCompatService {
  async login(name, phone) {
    if (!name || !name.trim()) {
      throw new ApiError(400, "name is required");
    }
    if (!/^\d{10}$/.test(phone || "")) {
      throw new ApiError(400, "phone must be a 10-digit number");
    }

    const user = await prisma.user.upsert({
      where: { phoneNumber: phone },
      update: { displayName: name.trim() },
      create: {
        phoneNumber: phone,
        displayName: name.trim(),
        userType: "PERSONAL",
      },
      select: {
        id: true,
        phoneNumber: true,
        displayName: true,
      },
    });

    return {
      id: user.id,
      name: user.displayName || user.phoneNumber,
      phone: user.phoneNumber,
    };
  }

  async getCustomers(userId) {
    const contacts = await prisma.contact.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        currentBalance: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    const contactIds = contacts.map((c) => c.id);
    const latestByContact = contactIds.length
      ? await prisma.ledger.groupBy({
          by: ["contactId"],
          where: { userId, contactId: { in: contactIds } },
          _max: { transactionDate: true },
        })
      : [];

    const lastTxnMap = new Map(
      latestByContact.map((row) => [row.contactId, row._max.transactionDate])
    );

    return contacts.map((contact) => ({
      id: contact.id,
      name: contact.name,
      phone: contact.phoneNumber,
      balance: Number(contact.currentBalance),
      lastTxn: lastTxnMap.get(contact.id) ? toDateOnly(lastTxnMap.get(contact.id)) : null,
    }));
  }

  async getCustomerById(userId, customerId) {
    const contact = await prisma.contact.findFirst({
      where: { id: customerId, userId },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        currentBalance: true,
      },
    });
    if (!contact) {
      throw new ApiError(404, "Customer not found");
    }

    const latest = await prisma.ledger.findFirst({
      where: { userId, contactId: customerId },
      orderBy: { transactionDate: "desc" },
      select: { transactionDate: true },
    });

    return {
      id: contact.id,
      name: contact.name,
      phone: contact.phoneNumber,
      balance: Number(contact.currentBalance),
      lastTxn: latest ? toDateOnly(latest.transactionDate) : null,
    };
  }

  async createCustomer(userId, name, phone) {
    if (!name || !name.trim()) {
      throw new ApiError(400, "name is required");
    }
    if (!/^\d{10}$/.test(phone || "")) {
      throw new ApiError(400, "phone must be a 10-digit number");
    }

    const existing = await prisma.contact.findUnique({
      where: { userId_phoneNumber: { userId, phoneNumber: phone } },
      select: { id: true },
    });
    if (existing) {
      throw new ApiError(409, "Customer already exists");
    }

    const contact = await prisma.contact.create({
      data: {
        userId,
        name: name.trim(),
        phoneNumber: phone,
      },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
      },
    });

    return {
      id: contact.id,
      name: contact.name,
      phone: contact.phoneNumber,
    };
  }

  async getTransactions(userId, customerId) {
    console.log("Fetching transactions for userId:", userId, "customerId:", customerId);
    const ledgerRows = await prisma.ledger.findMany({
      where: {
        userId,
        ...(customerId ? { contactId: customerId } : {}),
      },
      orderBy: { transactionDate: "asc" },
      select: {
        id: true,
        contactId: true,
        transactionDate: true,
        note: true,
        amount: true,
        type: true,
      },
    });

    return ledgerRows.map((row) => {
      const abs = Number(row.amount);
      return {
        id: row.id,
        customerId: row.contactId,
        date: toDateOnly(row.transactionDate),
        desc: row.note || "",
        amount: row.type === "PAYMENT" ? -abs : abs,
        confirmationMode: "PERSONAL",
        confirmationStatus: "CONFIRMED",
      };
    });
  }

  async createTransaction(userId, payload) {
    const { customerId, type, amount, desc = "", date, confirmationMode = "PERSONAL" } = payload || {};

    if (!customerId) {
      throw new ApiError(400, "customerId is required");
    }
    if (!["given", "received"].includes(type)) {
      throw new ApiError(400, "type must be 'given' or 'received'");
    }
    if (!["STRICT", "PERSONAL"].includes(confirmationMode)) {
      throw new ApiError(400, "confirmationMode must be 'STRICT' or 'PERSONAL'");
    }

    const validAmount = Number(amount);
    if (!Number.isFinite(validAmount) || validAmount <= 0) {
      throw new ApiError(400, "amount must be a positive number");
    }

    const contact = await prisma.contact.findFirst({
      where: { id: customerId, userId },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
      },
    });
    if (!contact) {
      throw new ApiError(404, "Customer not found");
    }

    if (confirmationMode === "STRICT") {
      const receiver = await prisma.user.findUnique({
        where: { phoneNumber: contact.phoneNumber },
        select: { id: true },
      });

      const request = await prisma.transactionRequest.create({
        data: {
          senderId: userId,
          receiverPhone: contact.phoneNumber,
          receiverId: receiver?.id,
          amount: validAmount,
          type: type === "given" ? "PAYMENT" : "CREDIT",
          note: desc || null,
          status: "PENDING",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      return {
        transaction: null,
        notification: {
          id: request.id,
          customerId: contact.id,
          transactionId: request.id,
          title: "Transaction Confirmation Needed",
          message: `Rs ${validAmount} ${type === "given" ? "given to" : "received from"} ${contact.name}`,
          status: "PENDING",
          createdAt: request.createdAt,
        },
      };
    }

    const signedAmount = type === "given" ? -validAmount : validAmount;
    const ledgerType = type === "given" ? "PAYMENT" : "CREDIT";
    const when = date ? new Date(date) : new Date();
    if (Number.isNaN(when.getTime())) {
      throw new ApiError(400, "Invalid date");
    }

    const created = await prisma.$transaction(async (tx) => {
      const updatedContact = await tx.contact.update({
        where: { id: contact.id },
        data: { currentBalance: { increment: signedAmount } },
        select: { currentBalance: true },
      });

      return tx.ledger.create({
        data: {
          userId,
          contactId: contact.id,
          amount: validAmount,
          type: ledgerType,
          note: desc || null,
          balanceAfter: updatedContact.currentBalance,
          transactionDate: when,
          approvedAt: new Date(),
          approvedBy: userId,
        },
      });
    });

    return {
      transaction: {
        id: created.id,
        customerId: created.contactId,
        date: toDateOnly(created.transactionDate),
        desc: created.note || "",
        amount: signedAmount,
        confirmationMode: "PERSONAL",
        confirmationStatus: "CONFIRMED",
      },
      notification: null,
    };
  }

  async getNotifications(userId) {
    const requests = await prisma.transactionRequest.findMany({
      where: { receiverId: userId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        receiverPhone: true,
        amount: true,
        status: true,
        createdAt: true,
      },
    });

    return requests.map((r) => ({
      id: r.id,
      title: "Transaction Confirmation Needed",
      message: `Rs ${Number(r.amount)} pending with ${r.receiverPhone || "customer"}`,
      status: r.status,
      createdAt: r.createdAt,
    }));
  }

  async createNotification(payload) {
    return {
      id: payload?.id || randomUUID(),
      customerId: payload?.customerId || null,
      transactionId: payload?.transactionId || null,
      title: payload?.title || "Notification",
      message: payload?.message || "",
      status: payload?.status || "PENDING",
      createdAt: payload?.createdAt || new Date().toISOString(),
    };
  }

  async updateNotification(userId, notificationId, status) {
    if (!["PENDING", "CONFIRMED", "REJECTED"].includes(status)) {
      throw new ApiError(400, "status must be PENDING, CONFIRMED, or REJECTED");
    }

    const mappedStatus = status === "CONFIRMED" ? "APPROVED" : status;
    if (status === "CONFIRMED" ){
      return await TransactionService.handleRequest(userId, notificationId, 'APPROVED');
    }
    if (status === "REJECTED" ){
      return await TransactionService.handleRequest(userId, notificationId, 'REJECTED');
    }

    const updated = await prisma.transactionRequest.updateMany({
      where: { id: notificationId, senderId: userId },
      data: { status: mappedStatus },
    });
    if (!updated.count) {
      throw new ApiError(404, "Notification not found");
    }
    console.log(" ledgerCompat.service Updated transaction request:", { notificationId, userId, status: mappedStatus });
    return {
      id: notificationId,
      status,
      updatedAt: new Date().toISOString(),
    };
  }
}

export default new LedgerCompatService();
