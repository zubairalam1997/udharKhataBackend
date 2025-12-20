import {z} from "zod";

export const sendOTPSchema = z.object({
    body: z.object({
        phoneNumber: z.string().regex(/^[6-9]\d{9}$/, 'Invalid phone number')
        .length(10, 'Phone number must be 10 digits')
    
    })
});

export const verifyOTPSchema = z.object({
    body: z.object({
        phoneNumber: z.string()
            .regex(/^[6-9]\d{9}$/, 'Invalid phone number')
            .length(10),
        otp: z.string()
            .length(6, 'OTP must be 6 digits')
            .regex(/^\d+$/, 'OTP must contain only numbers')
    })
});

export const updateProfileSchema = z.object({

    body: z.object({userType: z.enum(['PERSONAL', 'BUSINESS'],{
        errorMap: ()=> ({message: "User type must be PERSONAL or BUSINESS"})
    }),
    displayName: z.string()
    .min(2, "Display name must be atleast 2 characters")
    .max(50, "Display Name must not exceed 50 characters")
    .optional(),
    businessName: z.string()
    .min(2, "Business name must be at least 2 characters")
    .max(100, "Business name must not exceed 100 characters")
    .optional(),
    gstIn: z.string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GST number")
    .optional()
    }).refine(data => {
        if(data.userType === 'PERSONAL' && !data.displayName){
            return false;
        }
        if(data.userType === 'BUSINESS' && !data.businessName){
            return false;
        }
        return true;
    }, {
        message: "Display name required for PERSONAL, Busines name required for BUSINESS"
    })
})