interface ApiErrorResponse {
    message: string;
    errors?: Record<string, string[]>;
    statusCode?: number;
}

export class ApiError extends Error {
    public fieldErrors?: Record<string, string[]>;
    public statusCode?: number;
    public details?: unknown;

    constructor(
        message: string,
        fieldErrors?: Record<string, string[]>,
        statusCode?: number,
        details?: unknown,
    ) {
        super(message);
        this.name = 'ApiError';
        this.fieldErrors = fieldErrors;
        this.statusCode = statusCode;
        this.details = details;
    }
}

export function isApiError(error: unknown): error is ApiError {
    return error instanceof ApiError;
}
