import axios from "axios";

// Standardizing responses with the backend's API Gateway wrapper
export interface ApiResponse<T> {
    status: "success" | "error";
    data: T;
    message?: string;
    metadata?: {
        latency_ms: number;
        request_id: string;
    };
}

export interface PredictionResult {
    class: string;
    probability: number;
}

export interface HighlightZone {
    word: string;
    importance: number;
}

export interface InferenceResponse {
    id: string;
    text: string;
    latency_ms: number;
    predictions: PredictionResult[];
    highlight_zones: HighlightZone[];
}

export interface HistoryItem {
    id: string;
    createdAt: string;
    originalText: string;
    predictions: PredictionResult[];
}

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1",
    headers: {
        "Content-Type": "application/json",
    },
});

// Request Interceptor: Attach JWT token if it exists
api.interceptors.request.use((config) => {
    if (typeof window !== "undefined") {
        const token = localStorage.getItem("jwt");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

// Response Interceptor: Basic error handling (No Sugarcoating)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // We pass the error down to the UI to handle and display stark terminal errors
        if (error.response?.status === 401) {
            if (typeof window !== "undefined") {
                localStorage.removeItem("jwt");
                localStorage.removeItem("user");
                // Optionally redirect to login, but we'll manage this in AuthContext or hooks
            }
        }
        return Promise.reject(error);
    }
);

// Map backend labels/confidence to frontend PredictionResult structure
const mapPredictions = (labels: string[] = [], confidence: Record<string, number> = {}): PredictionResult[] => {
    // If we have labels, use them. If not, map everything from confidence mapping
    if (labels.length > 0) {
        return labels.map(l => ({
            class: l,
            probability: confidence[l] || 0
        }));
    }
    // Fallback if labels is empty but we have confidence scores
    return Object.entries(confidence).map(([key, value]) => ({
        class: key,
        probability: value
    })).sort((a, b) => b.probability - a.probability);
};

// Endpoints
export const submitClinicalNote = async (text: string): Promise<InferenceResponse> => {
    const res = await api.post<ApiResponse<any>>("/analyze", { text });
    const { data } = res.data;

    return {
        id: data.predictionId || data.noteId,
        text: text,
        latency_ms: data.latency || 0,
        predictions: mapPredictions(data.labels, data.confidence),
        highlight_zones: data.highlight_zones || []
    };
};

export const getHistory = async (): Promise<HistoryItem[]> => {
    const res = await api.get<ApiResponse<any[]>>("/history");
    // Some backend versions might have 'data' as { count, data } or just []. 
    // MedicalController.getHistory returns { status, count, data: history }
    const historyData = Array.isArray(res.data.data) ? res.data.data : [];

    return historyData.map(item => ({
        id: item.id,
        createdAt: item.createdAt,
        originalText: item.rawText,
        predictions: mapPredictions(
            item.predictions?.[0]?.predictedLabels,
            item.predictions?.[0]?.confidenceScores
        )
    }));
};

export const getPredictionById = async (id: string): Promise<InferenceResponse> => {
    const res = await api.get<ApiResponse<any>>(`/analyze/${id}`); // Note: Backend may need this route
    const { data } = res.data;

    return {
        id: data.id,
        text: data.rawText,
        latency_ms: data.predictions?.[0]?.inferenceTimeMs || 0,
        predictions: mapPredictions(
            data.predictions?.[0]?.predictedLabels,
            data.predictions?.[0]?.confidenceScores
        ),
        highlight_zones: data.predictions?.[0]?.explanation || []
    };
};

export const getExportData = async (id: string): Promise<any> => {
    try {
        console.log("INIT_EXPORT_REQUEST", { id, timestamp: new Date().toISOString() });
        const res = await api.get<ApiResponse<any>>(`/analyze/${id}/export`);
        console.log("EXPORT_FETCH_SUCCESS", { id });
        return res.data.data;
    } catch (error: any) {
        console.error("EXPORT_FETCH_CRITICAL", {
            id,
            status: error.response?.status,
            message: error.response?.data?.message || error.message
        });
        throw error; // Re-throw so the UI can catch and notify
    }
};

export const exportPdfServerSide = async (id: string, token: string | null): Promise<Blob> => {
    try {
        console.log("INIT_SSG_PDF_REQUEST", { id, timestamp: new Date().toISOString() });
        const finalToken = token || (typeof window !== "undefined" ? localStorage.getItem("jwt") : null);

        const res = await api.post(`/analyze/${id}/export-pdf`, { token: finalToken }, {
            responseType: 'blob'
        });
        console.log("SSG_PDF_FETCH_SUCCESS", { id });
        return res.data;
    } catch (error: any) {
        console.error("SSG_PDF_FETCH_CRITICAL", {
            id,
            status: error.response?.status,
            message: error.message
        });
        throw new Error("Failed to generate Server-Side PDF.");
    }
};

export default api;
