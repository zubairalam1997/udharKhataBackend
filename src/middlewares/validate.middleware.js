import { ApiError } from "../utils/ApiError.js";

export const validate = (schema) => async(req, res, next)=>{
    try {
        await schema.parseAsync({
            body: req.body,
            query: req.query,
            params: req.params
        });
        next();
    } catch (error) {
        const errorMessage = error.errors?.map(e=> e.message).join(', ') || 'Validation failed';
        throw new ApiError(400, errorMessage);
    }
}