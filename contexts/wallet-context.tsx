"use client";

import React, { createContext, useContext, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useAppStore } from "@/stores/use-app-store";

// Types
interface WalletData {
  id: string;
  username: string;
  email: string;
  wallet_balance: number;
  clerk_user_id: string;
  created_at: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  created_at: string;
}

interface WalletContextType {
  walletData: WalletData | null;
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refreshWallet: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  markAllAsRead: () => void;
  markAsRead: (id: string) => void;
}

// API Configuration
const API_BASE_URL = "https://luco-backend.onrender.com/api/v1";

// Context
const WalletContext = React.createContext<WalletContextType | undefined>(undefined);

// Provider Props
interface WalletProviderProps {
  children: React.ReactNode;
  refreshInterval?: number; // in milliseconds, default 30 seconds
}

export function WalletProvider({
  children,
  refreshInterval = 30000, // 30 seconds default
}: WalletProviderProps) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const setWalletData = useAppStore((state) => state.setWalletData);
  const walletCache = useAppStore((state) => state.walletCache);
  const isCacheValid = useAppStore((state) => state.isCacheValid);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Fetch wallet data
  const fetchWallet = React.useCallback(async () => {
    // Don't fetch if Clerk hasn't loaded or user isn't signed in
    if (!isLoaded || !isSignedIn) {
      console.log("[Wallet] Skipping fetch - not ready or not signed in");
      return;
    }

    // Check if cache is valid and data exists
    if (walletCache && isCacheValid(walletCache)) {
      console.log("[Wallet] Using cached data");
      // No need to setWalletData here, as it's already in the store
      return;
    }

    try {
      // Wait a bit for session to be ready
      await new Promise(resolve => setTimeout(resolve, 300));

      // Get token - Clerk will use the default JWT
      const token = await getToken();
      if (!token) {
        console.warn("No authentication token available for wallet");
        return;
      }

      console.log("[Wallet] Token obtained for wallet fetch");

      const response = await fetch(`${API_BASE_URL}/account/wallet`, {
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      }).catch(err => {
        console.warn("[Wallet] Network error - backend may be unavailable:", err.message);
        return null;
      });

      if (!response) {
        // Network error, silently fail
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Wallet] Fetch failed:", response.status, errorText);
        throw new Error(`Failed to fetch wallet data: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("[Wallet] Wallet data received:", data);
      // Transform API response to match store structure
      setWalletData({
        balance: data.wallet_balance,
        currency: "UGX",
        last_updated: new Date().toISOString()
      });
      setError(null);
    } catch (error) {
      console.error("[Wallet] Error fetching wallet:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch wallet data");
    } finally {
      setLoading(false);
    }
  }, [getToken, isLoaded, isSignedIn, walletCache, isCacheValid, setWalletData]); // Added dependencies

  // Fetch notifications (using messages as notifications)
  const fetchNotifications = React.useCallback(async () => {
    // Don't fetch if Clerk hasn't loaded or user isn't signed in
    if (!isLoaded || !isSignedIn) {
      console.log("[Notifications] Skipping fetch - not ready or not signed in");
      return;
    }

    try {
      // Wait a bit for session to be ready
      await new Promise(resolve => setTimeout(resolve, 300));

      // Get token - Clerk will use the default JWT
      const token = await getToken();
      if (!token) {
        console.warn("No authentication token available for notifications");
        return; // Skip fetching if no token
      }

      const response = await fetch(
        `${API_BASE_URL}/account/reports/messages?skip=0&limit=10`,
        {
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      ).catch(err => {
        console.warn("[Notifications] Network error - backend may be unavailable:", err.message);
        return null;
      });

      if (!response) {
        // Network error, silently fail
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Notifications] Fetch failed:", response.status, errorText);
        throw new Error(`Failed to fetch notifications: ${response.statusText}`);
      }

      const messages = await response.json();

      // Transform messages into notifications
      const transformedNotifications: Notification[] = messages.map((msg: any) => {
        const isRecent =
          new Date(msg.created_at).getTime() > Date.now() - 3600000; // Last hour

        let title = "";
        let message = "";

        switch (msg.status.toLowerCase()) {
          case "success":
          case "delivered":
            title = "Message Delivered Successfully";
            message = `SMS to ${msg.recipient} was delivered`;
            break;
          case "failed":
            title = "Message Failed";
            message = `SMS to ${msg.recipient} failed to deliver`;
            break;
          case "pending":
            title = "Message Pending";
            message = `SMS to ${msg.recipient} is being processed`;
            break;
          default:
            title = "Message Update";
            message = `SMS to ${msg.recipient} - ${msg.status}`;
        }

        return {
          id: msg.id.toString(),
          title,
          message,
          time: getRelativeTime(msg.created_at),
          read: !isRecent, // Mark as unread if sent in the last hour
          created_at: msg.created_at,
        };
      });

      setNotifications(transformedNotifications);
      setError(null);
    } catch (err) {
      console.warn("[Notifications] Error fetching notifications:", err);
      // Don't set error for notifications to avoid disrupting the app
    }
  }, [getToken, isLoaded, isSignedIn]);

  // Get relative time
  const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return date.toLocaleDateString();
  };

  // Initial fetch
  React.useEffect(() => {
    const initialFetch = async () => {
      setLoading(true);
      await Promise.all([fetchWallet(), fetchNotifications()]);
      setLoading(false);
    };

    initialFetch();
  }, [fetchWallet, fetchNotifications]);

  // Set up polling
  React.useEffect(() => {
    const intervalId = setInterval(() => {
      // Only fetch wallet if cache is invalid or data is missing
      if (!isCacheValid(walletCache) || !walletCache) {
        fetchWallet();
      }
      fetchNotifications();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [fetchWallet, fetchNotifications, refreshInterval, walletCache, isCacheValid]); // Added dependencies

  // Mark all as read
  const markAllAsRead = React.useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  // Mark single notification as read
  const markAsRead = React.useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  // Calculate unread count
  const unreadCount = React.useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  // Use wallet data from Zustand store, or null if not loaded/cached
  const walletData = walletCache?.data ? {
    id: "",
    username: "",
    email: "",
    wallet_balance: walletCache.data.balance,
    clerk_user_id: "",
    created_at: walletCache.data.last_updated || ""
  } : null;

  const value: WalletContextType = {
    walletData,
    notifications,
    unreadCount,
    loading,
    error,
    refreshWallet: fetchWallet,
    refreshNotifications: fetchNotifications,
    markAllAsRead,
    markAsRead,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

// Custom hook to use the wallet context
export function useWallet() {
  const context = React.useContext(WalletContext);

  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }

  return context;
}

// Helper hook to format currency
export function useCurrency() {
  const formatCurrency = React.useCallback((amount: number): string => {
    return `UGX ${amount.toLocaleString()}`;
  }, []);

  const calculateMessages = React.useCallback((balance: number): number => {
    return Math.floor(balance / 32);
  }, []);

  return { formatCurrency, calculateMessages };
}