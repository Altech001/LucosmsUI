"use client";

import * as React from "react";
import { PageLayout } from "@/components/page-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Wallet,
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
} from "lucide-react";
import { useToast } from "@/contexts/toast-context";
import { Breadcrumb } from "@/components/breadcrumb";

// Types
interface WalletData {
  id: string;
  username: string;
  email: string;
  wallet_balance: number;
  clerk_user_id: string;
  created_at: string;
}

interface Transaction {
  id: number;
  user_id: string;
  amount: number;
  transaction_type: "topup" | "sms_send" | "sms_scheduled" | "sms_refund";
  created_at: string;
}

interface TopUpRequest {
  amount: number;
}

interface TopUpResponse {
  id: number;
  user_id: string;
  amount: number;
  transaction_type: string;
  created_at: string;
}

// API Configuration
const API_BASE_URL = "https://luco-backend.onrender.com/api/v1";

// API Functions
const walletAPI = {
  getWallet: async (): Promise<WalletData> => {
    const response = await fetch(`${API_BASE_URL}/account/wallet`, {
      headers: { accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error("Failed to fetch wallet data");
    }
    return response.json();
  },

  topUp: async (data: TopUpRequest): Promise<TopUpResponse> => {
    const response = await fetch(`${API_BASE_URL}/account/wallet/topup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to process top-up");
    }
    return response.json();
  },

  getTransactions: async (params?: {
    skip?: number;
    limit?: number;
  }): Promise<Transaction[]> => {
    const queryParams = new URLSearchParams();
    queryParams.append("skip", (params?.skip || 0).toString());
    queryParams.append("limit", (params?.limit || 100).toString());

    const response = await fetch(
      `${API_BASE_URL}/account/wallet/transactions?${queryParams.toString()}`,
      {
        headers: { accept: "application/json" },
      }
    );
    if (!response.ok) {
      throw new Error("Failed to fetch transactions");
    }
    return response.json();
  },
};

const topupOptions = [
  { amount: 1000, bonus: 1, popular: false },
  { amount: 25000, bonus: 20, popular: false },
  { amount: 50000, bonus: 30, popular: true },
  { amount: 100000, bonus: 40, popular: false },
  { amount: 500000, bonus: 50, popular: false },
];

export default function TopUpPage() {
  const { showToast } = useToast();
  const [walletData, setWalletData] = React.useState<WalletData | null>(null);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [fetchingWallet, setFetchingWallet] = React.useState(true);
  const [selectedAmount, setSelectedAmount] = React.useState<number | null>(
    null
  );
  const [customAmount, setCustomAmount] = React.useState("");
  const [processingTopUp, setProcessingTopUp] = React.useState(false);

  // Fetch wallet data
  const fetchWallet = React.useCallback(async () => {
    try {
      setFetchingWallet(true);
      const data = await walletAPI.getWallet();
      setWalletData(data);
    } catch (error) {
      showToast(
        "Error",
        error instanceof Error ? error.message : "Failed to fetch wallet",
        "error"
      );
    } finally {
      setFetchingWallet(false);
    }
  }, [showToast]);

  // Fetch transactions
  const fetchTransactions = React.useCallback(async () => {
    try {
      const data = await walletAPI.getTransactions({ limit: 10 });
      setTransactions(data);
    } catch (error) {
      showToast(
        "Error",
        error instanceof Error ? error.message : "Failed to fetch transactions",
        "error"
      );
    }
  }, [showToast]);

  React.useEffect(() => {
    fetchWallet();
    fetchTransactions();
  }, [fetchWallet, fetchTransactions]);

  // Handle preset top-up
  const handlePresetTopUp = async (amount: number) => {
    setSelectedAmount(amount);
    setProcessingTopUp(true);
    try {
      await walletAPI.topUp({ amount });
      showToast(
        "Success",
        `Successfully topped up UGX ${amount.toLocaleString()}`,
        "success"
      );
      fetchWallet();
      fetchTransactions();
      setSelectedAmount(null);
    } catch (error) {
      showToast(
        "Error",
        error instanceof Error ? error.message : "Failed to process top-up",
        "error"
      );
    } finally {
      setProcessingTopUp(false);
    }
  };

  // Handle custom top-up
  const handleCustomTopUp = async () => {
    const amount = parseFloat(customAmount);

    if (!amount || amount <= 0) {
      showToast("Validation Error", "Please enter a valid amount", "warning");
      return;
    }

    if (amount < 1000) {
      showToast(
        "Validation Error",
        "Minimum top-up amount is UGX 1,000",
        "warning"
      );
      return;
    }

    setProcessingTopUp(true);
    try {
      await walletAPI.topUp({ amount: Math.floor(amount) });
      showToast(
        "Success",
        `Successfully topped up UGX ${amount.toLocaleString()}`,
        "success"
      );
      setCustomAmount("");
      fetchWallet();
      fetchTransactions();
    } catch (error) {
      showToast(
        "Error",
        error instanceof Error ? error.message : "Failed to process top-up",
        "error"
      );
    } finally {
      setProcessingTopUp(false);
    }
  };

  // Calculate messages from balance
  const calculateMessages = (balance: number): number => {
    return Math.floor(balance / 32);
  };

  // Get transaction type display
  const getTransactionTypeDisplay = (
    type: string
  ): { label: string; color: string; icon: React.ReactNode } => {
    switch (type) {
      case "topup":
        return {
          label: "Top Up",
          color: "text-emerald-600 dark:text-emerald-400",
          icon: <TrendingUp className="h-4 w-4" />,
        };
      case "sms_send":
        return {
          label: "SMS Sent",
          color: "text-red-600 dark:text-red-400",
          icon: <TrendingDown className="h-4 w-4" />,
        };
      case "sms_scheduled":
        return {
          label: "SMS Scheduled",
          color: "text-amber-600 dark:text-amber-400",
          icon: <Clock className="h-4 w-4" />,
        };
      case "sms_refund":
        return {
          label: "SMS Refund",
          color: "text-blue-600 dark:text-blue-400",
          icon: <TrendingUp className="h-4 w-4" />,
        };
      default:
        return {
          label: type,
          color: "text-muted-foreground",
          icon: <DollarSign className="h-4 w-4" />,
        };
    }
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <PageLayout>
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/" },
            { label: "Topup" },
          ]}
        />

        <div>
          <h1 className="text-xl font-bold tracking-tight">Top Up Wallet</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Add credits to your SMS wallet
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Choose Your Desired SMS Pack
                </CardTitle>
                <CardDescription>
                  Select a top-up amount or enter a custom value
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {topupOptions.map((option) => (
                    <Card
                      key={option.amount}
                      className={`relative cursor-pointer transition-all hover:border-primary shadow-none ${
                        option.popular ? "border-primary shadow-md" : ""
                      } ${
                        selectedAmount === option.amount
                          ? "ring-2 ring-primary"
                          : ""
                      }`}
                      onClick={() =>
                        !processingTopUp && handlePresetTopUp(option.amount)
                      }
                    >
                      {option.popular && (
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                          <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                            Popular
                          </span>
                        </div>
                      )}
                      <CardContent className="pt-6 text-center">
                        {processingTopUp && selectedAmount === option.amount ? (
                          <div className="flex justify-center py-4">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          </div>
                        ) : (
                          <>
                            <div className="text-xl font-bold">
                              UGX {option.amount.toLocaleString()}
                            </div>
                            {option.bonus > 0 && (
                              <div className="mt-2 text-xs text-green-600 dark:text-green-400 font-medium">
                                +{option.bonus}% bonus
                              </div>
                            )}
                            <div className="mt-3 text-xs text-muted-foreground">
                              ≈{" "}
                              {calculateMessages(
                                option.amount * (1 + option.bonus / 100)
                              )}{" "}
                              messages
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Recent Transactions</CardTitle>
                <CardDescription>Your latest wallet activity</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No transactions yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {transactions.map((transaction) => {
                      const typeInfo = getTransactionTypeDisplay(
                        transaction.transaction_type
                      );
                      return (
                        <div
                          key={transaction.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-full bg-background ${typeInfo.color}`}
                            >
                              {typeInfo.icon}
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                {typeInfo.label}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(transaction.created_at)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p
                              className={`text-sm font-semibold ${
                                transaction.amount > 0
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              {transaction.amount > 0 ? "+" : ""}
                              {transaction.amount.toLocaleString()} UGX
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Current Balance */}
            <Card className="shadow-none border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Current Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {fetchingWallet ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : walletData ? (
                  <>
                    <div className="text-3xl font-bold">
                      UGX {walletData.wallet_balance.toLocaleString()}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      ≈ {calculateMessages(walletData.wallet_balance)} messages
                      remaining
                    </p>
                    <div className="mt-4 pt-4 border-t space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Username</span>
                        <span className="font-medium">
                          {walletData.username}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Email</span>
                        <span className="font-medium truncate max-w-[150px]">
                          {walletData.email}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Failed to load wallet
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Custom Payment */}
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Custom Amount
                </CardTitle>
                <CardDescription className="text-xs">
                  Enter your desired top-up amount
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      UGX
                    </span>
                    <Input
                      type="number"
                      placeholder="100000"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="pl-12"
                      min="1000"
                      disabled={processingTopUp}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Minimum: UGX 1,000
                  </p>
                  <Button
                    className="w-full"
                    onClick={handleCustomTopUp}
                    disabled={processingTopUp || !customAmount}
                  >
                    {processingTopUp ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Submit Top Up"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="shadow-none bg-muted/50">
              <CardContent className="pt-6">
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">Quick Info:</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>1 SMS ≈ 32 UGX</li>
                    <li>Instant credit after payment</li>
                    <li>Bonus credits on larger packs</li>
                    <li>No expiration date</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
