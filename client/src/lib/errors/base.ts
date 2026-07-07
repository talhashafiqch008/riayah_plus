interface ApiErrorResponse {
    message: string;
    errors?: Record<string, string[]>;
    statusCode?: number;
}

export class ApiError extends Error {
    public fieldErrors?: Record<string, string[]>;
    public statusCode?: number;

    constructor(message: string, fieldErrors?: Record<string, string[]>, statusCode?: number) {
        super(message);
        this.name = 'ApiError';
        this.fieldErrors = fieldErrors;
        this.statusCode = statusCode;
    }
}

export function isApiError(error: unknown): error is ApiError {
    return error instanceof ApiError;
}
