import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import ContactService from "../services/contact.service.js";

const getContacts = asyncHandler(async(req, res) => {
    const { search, page = 1, limit = 20 } = req.query;
    
    const result = await ContactService.getContacts(
        req.user.id,
        search,
        parseInt(page),
        parseInt(limit)
    );

    return res.status(200).json(
        new ApiResponse(200, result, "Contacts fetched successfully")
    );
});

const getContactDetails = asyncHandler(async(req, res) => {
    const { contactId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const contact = await ContactService.getContactDetails(
        req.user.id,
        contactId,
        parseInt(page),
        parseInt(limit)
    );

    return res.status(200).json(
        new ApiResponse(200, contact, "Contact details fetched successfully")
    );
});

const getLedger = asyncHandler(async(req, res) => {
    const { contactId } = req.params;
    const { startDate, endDate, page = 1, limit = 50 } = req.query;

    const ledger = await ContactService.getLedger(
        req.user.id,
        contactId,
        startDate,
        endDate,
        parseInt(page),
        parseInt(limit)
    );

    return res.status(200).json(
        new ApiResponse(200, ledger, "Ledger fetched successfully")
    );
});

const generatePDF = asyncHandler(async(req, res) => {
    const { contactId } = req.params;
    const { startDate, endDate } = req.query;

    const pdfBuffer = await ContactService.generatePDFStatement(
        req.user.id,
        contactId,
        startDate,
        endDate
    );

    // Get contact name for filename
    const contact = await ContactService.getContactDetails(req.user.id, contactId, 1, 1);
    const fileName = `statement_${contact.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
 
       // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.send(pdfBuffer);
});

const syncContacts = asyncHandler(async (req, res) => {
    const { phoneNumbers } = req.body;

    const result = await ContactService.syncContacts(req.user.id, phoneNumbers);

    return res.status(200).json(
        new ApiResponse(200, result, 'Contacts synced successfully')
    );
});

export {
    getContacts,
    getContactDetails,
    getLedger,
    generatePDF,
    syncContacts
};