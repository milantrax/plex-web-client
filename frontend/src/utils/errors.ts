/** Narrows an unknown `catch` value to the `{ response: { status, data.error } }`
 *  shape axios rejections carry, without pulling axios into every call site. */
interface ApiErrorLike {
  response?: {
    status?: number;
    data?: { error?: string };
  };
  message?: string;
}

export const asApiError = (error: unknown): ApiErrorLike =>
  (error && typeof error === 'object' ? error : {}) as ApiErrorLike;

/** The server-supplied error message for a failed request, or `fallback`. */
export const getApiErrorMessage = (error: unknown, fallback: string): string =>
  asApiError(error).response?.data?.error || fallback;

/** The HTTP status of a failed request, when the rejection carries one. */
export const getApiErrorStatus = (error: unknown): number | undefined =>
  asApiError(error).response?.status;
