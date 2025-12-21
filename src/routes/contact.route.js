import { Router } from "express";
import {
    getContacts,
    getContactDetails,
    getLedger,
    generatePDF,
    syncContacts
} from "../controllers/contact.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
    getContactsSchema,
    getContactDetailsSchema,
    getLedgerSchema,
    generatePDFSchema
} from "../validators/contact.validator.js";

const router = Router();

// All contact routes require authentication
router.use(verifyJWT);

// Get all contacts
router.get('/', validate(getContactsSchema), getContacts);

// Sync phone contacts
router.post('/sync', syncContacts);

// Get single contact details
router.get('/:contactId', validate(getContactDetailsSchema), getContactDetails);

// Get ledger for a contact
router.get('/:contactId/ledger', validate(getLedgerSchema), getLedger);

// Generate PDF statement
router.get('/:contactId/pdf', validate(generatePDFSchema), generatePDF);

export default router;