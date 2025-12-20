import { Router } from "express";
import { 
    createTransactionRequest,
    handleTransactionRequest,
    getPendingRequests,
    sendReminder
 } from "../controllers/transaction.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { 
    createTransactionRequestSchema,
    handleTransactionRequestSchema,
    getPendingRequestsSchema,
    sendReminderSchema
 } from "../validators/transaction.validator.js";

 const router = Router();

 router.use(verifyJWT);

 // create transaction request
 router.post('/request', validate(createTransactionRequestSchema), createTransactionRequest);

 // handle request(approve/reject)
 router.patch('/request/:requestId', validate(handleTransactionRequestSchema), handleTransactionRequest);

 // get pending requests
 router.get('/pending', validate(getPendingRequestsSchema), getPendingRequests);

 // send reminder
 router.post('/request/:requestId/remind', validate(sendReminderSchema), sendReminder);

 export default router;