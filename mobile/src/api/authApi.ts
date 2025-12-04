import apiClient from "./apiClient";
import type {
    LoginRequest,
    LoginResponse,
    SignUpRequest,
    SignUpResponse,
} from "./types";
import { USE_MOCK_DATA } from "../config/useMockData";
import { mockAuthApi } from "../mock/mockApi";

export const authApi = {
    login: async (data: LoginRequest): Promise<LoginResponse> => {
        if (USE_MOCK_DATA) {
            console.log("[AUTH] Using mock data for login");
            return mockAuthApi.login(data);
        }
        console.log("[AUTH] Sending login request to /auth/login");
        console.log("[AUTH] Request data:", {
            identifier: data.identifier,
            password: "***",
        });
        const response = await apiClient.post<LoginResponse>(
            "/auth/login",
            data
        );
        console.log("[AUTH] Login response received");
        return response.data;
    },

    signup: async (data: SignUpRequest): Promise<SignUpResponse> => {
        if (USE_MOCK_DATA) {
            console.log("[AUTH] Using mock data for signup");
            return mockAuthApi.signup(data);
        }
        console.log("[AUTH] Sending signup request to /auth/register");
        console.log("[AUTH] Request data:", {
            username: data.username,
            email: data.email,
            name: data.name,
            password: "***",
        });
        const response = await apiClient.post<SignUpResponse>(
            "/auth/register",
            data
        );
        console.log("[AUTH] Signup response received");
        return response.data;
    },
};
