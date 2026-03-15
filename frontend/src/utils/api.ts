const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";


export const api = {
    async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const token = localStorage.getItem('token');

        const headers: Record<string, string> = {};

        // Merge headers from options
        if (options.headers) {
            if (options.headers instanceof Headers) {
                options.headers.forEach((value, key) => {
                    headers[key] = value;
                });
            } else if (Array.isArray(options.headers)) {
                options.headers.forEach(([key, value]) => {
                    headers[key] = value;
                });
            } else {
                Object.assign(headers, options.headers);
            }
        }

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
            headers['x-auth-token'] = token;
        }

        const url = `${API_URL}${endpoint}`;
        console.log(`[API] Fetching: ${url}`);

        try {
            const response = await fetch(url, {
                ...options,
                headers,
            });

            let result: any;
            const contentType = response.headers.get('content-type');
            
            try {
                if (contentType && contentType.includes('application/json')) {
                    result = await response.json();
                } else {
                    result = { message: await response.text() };
                }
            } catch (e) {
                result = { message: 'Failed to parse server response' };
            }

            if (!response.ok) {
                const errorMessage = result?.message || result?.error || `Error: ${response.status} ${response.statusText}`;
                throw new Error(errorMessage);
            }

            return result.data;
        } catch (error: any) {
            console.error(`[API] Error on ${url}:`, error);
            if (error.message === 'Failed to fetch') {
                throw new Error(`Connectivity Error: Could not connect to the server at ${API_URL}. Please ensure the backend is running.`);
            }
            throw error;
        }
    },

    get<T = any>(endpoint: string, options: RequestInit = {}) {
        return this.request<T>(endpoint, { ...options, method: 'GET' });
    },

    post<T = any>(endpoint: string, body: any, options: RequestInit = {}) {
        const headers: Record<string, string> = {};
        if (!(body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }

        return this.request<T>(endpoint, {
            ...options,
            method: 'POST',
            headers: { ...headers, ...(options.headers as any) },
            body: body instanceof FormData ? body : JSON.stringify(body),
        });
    },

    patch<T = any>(endpoint: string, body: any, options: RequestInit = {}) {
        const headers: Record<string, string> = {};
        if (!(body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }

        return this.request<T>(endpoint, {
            ...options,
            method: 'PATCH',
            headers: { ...headers, ...(options.headers as any) },
            body: body instanceof FormData ? body : JSON.stringify(body),
        });
    }
};
