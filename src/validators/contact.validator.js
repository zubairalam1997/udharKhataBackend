import { z } from 'zod';

// ISO 8601 datetime regex pattern
const ISO_DATETIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;

export const getContactsSchema = z.object({
    query: z.object({
        search: z.string().optional(),
        page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
        limit: z.string().regex(/^\d+$/).transform(Number).optional().default('20')
    })
});

export const getContactDetailsSchema = z.object({
    params: z.object({
        contactId: z.string().uuid('Invalid contact ID')
    }),
    query: z.object({
        page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
        limit: z.string().regex(/^\d+$/).transform(Number).optional().default('20')
    })
});

export const getLedgerSchema = z.object({
    params: z.object({
        contactId: z.string().uuid('Invalid contact ID')
    }),
    query: z.object({
        startDate: z.string().regex(ISO_DATETIME_REGEX, 'Invalid ISO 8601 datetime format').optional(),
        endDate: z.string().regex(ISO_DATETIME_REGEX, 'Invalid ISO 8601 datetime format').optional(),
        page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
        limit: z.string().regex(/^\d+$/).transform(Number).optional().default('50')
    })
});

export const generatePDFSchema = z.object({
    params: z.object({
        contactId: z.string().uuid('Invalid contact ID')
    }),
    query: z.object({
        startDate: z.string().regex(ISO_DATETIME_REGEX, 'Invalid ISO 8601 datetime format').optional(),
        endDate: z.string().regex(ISO_DATETIME_REGEX, 'Invalid ISO 8601 datetime format').optional()
    })
});

export const syncContactsSchema = z.object({
    body: z.object({        
        phoneNumbers: z.array(
            z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number')
        )
        .min(1, 'At least one phone number required')
        .max(1000, 'Cannot sync more than 1000 contacts at once')
    })
});