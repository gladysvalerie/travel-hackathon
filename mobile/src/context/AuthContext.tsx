import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authApi } from "../api/authApi";
import { userApi } from "../api/userApi";
import { USE_MOCK_DATA, SKIP_AUTH } from "../config/useMockData";
import { mockUser } from "../mock/mockData";
import type { User, LoginRequest, SignUpRequest } from "../api/types";

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (data: LoginRequest) => Promise<void>;
    signup: (data: SignUpRequest) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        try {
            if (USE_MOCK_DATA && SKIP_AUTH) {
                // Auto-login with mock user when using mock data AND skip auth is enabled
                setUser(mockUser);
                setToken("mock-token");
                setIsLoading(false);
            } else {
                loadStoredAuth();
            }
        } catch (error: any) {
            console.error("[AUTH ERROR] Initialization failed:", error);
            setIsLoading(false);
        }
    }, []);

    const loadStoredAuth = async () => {
        try {
            const storedToken = await AsyncStorage.getItem("auth_token");
            const storedUser = await AsyncStorage.getItem("user");

            if (storedToken && storedUser) {
                console.log("[AUTH] Found stored token, restoring session");
                setToken(storedToken);
                setUser(JSON.parse(storedUser));
            } else {
                console.log("[AUTH] No stored session found");
            }
        } catch (error) {
            console.error("[AUTH ERROR] Failed to load stored auth:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (data: LoginRequest) => {
        try {
            console.log(
                "[AUTH] Attempting login with identifier:",
                data.identifier
            );
            const response = await authApi.login(data);
            console.log("[AUTH] Login successful!");
            console.log(
                "[AUTH] User:",
                response.user.username,
                "| ID:",
                response.user.id
            );
            console.log(
                "[AUTH] Token received:",
                response.token.substring(0, 20) + "..."
            );

            await AsyncStorage.setItem("auth_token", response.token);
            await AsyncStorage.setItem("user", JSON.stringify(response.user));
            setToken(response.token);
            setUser(response.user);

            console.log("[AUTH] Token and user saved to storage");
        } catch (error: any) {
            const errorMessage =
                error.response?.data?.error || error.message || "Login failed";
            console.error("[AUTH ERROR] Login failed:", errorMessage);
            if (error.response) {
                console.error(
                    "[AUTH ERROR] Response status:",
                    error.response.status
                );
                console.error(
                    "[AUTH ERROR] Response data:",
                    error.response.data
                );
            }
            throw new Error(errorMessage);
        }
    };

    const signup = async (data: SignUpRequest) => {
        try {
            console.log(
                "[AUTH] Attempting signup for:",
                data.username,
                data.email
            );
            const response = await authApi.signup(data);
            console.log("[AUTH] Signup successful!");
            console.log(
                "[AUTH] User:",
                response.user.username,
                "| ID:",
                response.user.id
            );
            console.log(
                "[AUTH] Token received:",
                response.token.substring(0, 20) + "..."
            );

            await AsyncStorage.setItem("auth_token", response.token);
            await AsyncStorage.setItem("user", JSON.stringify(response.user));
            setToken(response.token);
            setUser(response.user);

            console.log("[AUTH] Token and user saved to storage");
        } catch (error: any) {
            const errorMessage =
                error.response?.data?.error || error.message || "Signup failed";
            console.error("[AUTH ERROR] Signup failed:", errorMessage);
            if (error.response) {
                console.error(
                    "[AUTH ERROR] Response status:",
                    error.response.status
                );
                console.error(
                    "[AUTH ERROR] Response data:",
                    error.response.data
                );
            }
            throw new Error(errorMessage);
        }
    };

    const logout = async () => {
        try {
            console.log("[AUTH] Logging out...");
            await AsyncStorage.removeItem("auth_token");
            await AsyncStorage.removeItem("user");
            setToken(null);
            setUser(null);
            console.log("[AUTH] Logout successful");
        } catch (error) {
            console.error("[AUTH ERROR] Logout failed:", error);
        }
    };

    const refreshUser = async () => {
        try {
            const updatedUser = await userApi.getCurrentUser();
            await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
            setUser(updatedUser);
        } catch (error) {
            console.error("[AUTH ERROR] Failed to refresh user:", error);
        }
    };

    const value: AuthContextType = {
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        login,
        signup,
        logout,
        refreshUser,
    };

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
};
