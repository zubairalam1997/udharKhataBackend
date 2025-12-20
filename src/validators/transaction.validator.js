import {z} from "zod";

export const createTransactionRequestSchema = z.object({
    body: z.object({
        receiverPhone: z.string()
            .regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number')
            .length(10, 'Phone number must be 10 digits'),
        name: z.string().min(2, 'Name cannot be less than 2 characters').max(100, 'Name cannot be greater than 100 characters').optional(),
        amount: z.number()
            .positive('Amount must be positive')
            .max(1000000, 'Amount cannot exceed ₹10,00,000')
            .refine(val => Number(val.toFixed(2)) === val, 'Amount can have maximum 2 decimal places'),
        type: z.enum(['CREDIT', 'PAYMENT'], {
            errorMap: () => ({ message: 'Type must be CREDIT or PAYMENT' })
        }),
        note: z.string()
            .max(200, 'Note cannot exceed 200 characters')
            .optional()
    })
});

export const handleTransactionRequestSchema = z.object({
    params: z.object({
        requestId: z.string().uuid('Invalid request ID')
    }),
    body: z.object({
        action: z.enum(['APPROVE', 'REJECT'], {
            errorMap: () => ({ message: 'Action must be APPROVE or REJECT' })
        }),
        rejectionReason: z.string()
            .max(200, 'Rejection reason cannot exceed 200 characters')
            .optional()
    }).refine(data => {
        if (data.action === 'REJECT' && !data.rejectionReason) {
            return false;
        }
        return true;
    }, {
        message: 'Rejection reason is required when rejecting'
    })
});

export const getPendingRequestsSchema = z.object({
    query: z.object({
        type: z.enum(['sent', 'received', 'all']).optional().default('all'),
        page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
        limit: z.string().regex(/^\d+$/).transform(Number).optional().default('20')
    })
});

export const sendReminderSchema = z.object({
    params: z.object({
        requestId: z.string().uuid('Invalid request ID')
    })
});