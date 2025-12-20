import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import TransactionService from "../services/transaction.service.js";

const createTransactionRequest = asyncHandler(async(req, res) => {
    const request = await TransactionService.createRequest(req.user.id, req.body);

    return res.status(201).json(
        new ApiResponse(201, request, "Transaction request created successfully")
    );
});

const handleTransactionRequest = asyncHandler(async(req, res) => {
    const {requestId} = req.params;
    const {action, rejectionReason} = req.body;

    const result = await TransactionService.handleRequest(req.user.id, requestId, action, rejectionReason);

    return res.status(200).json(
        new ApiResponse(200, result, action === 'APPROVE'? 'Transaction approved and ledger updated': 'Transaction rejected')
    )
});

const getPendingRequests = asyncHandler(async(req, res) => {
    const {type, page = 1, limit = 20} = req.query;

    const result = await TransactionService.getPendingRequests(
        req.user.id,
         type,
        parseInt(page)|| 1, 
        parseInt(limit)||20
    );

    return res.status(200).json(
        new ApiResponse(200, result, "Pending requests fetched successfully")
    );
});

const sendReminder = asyncHandler(async(req, res) => {
    const {requestId} = req.params;

    const result = await TransactionService.sendReminder(req.user.id, requestId);

    return res.status(200).json(
        new ApiResponse(200, result, "Reminder sent successfully")
    );
});

export{
    createTransactionRequest,
    handleTransactionRequest,
    getPendingRequests,
    sendReminder
};
