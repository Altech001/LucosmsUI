
"use client";

import * as React from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
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
  Phone,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/contexts/toast-context";
import { Breadcrumb } from "@/components/breadcrumb";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

interface PhoneVerificationResponse {
  identityname: string;
  message: string;
  success: boolean;
}

interface PaymentResponse {
  message: string;
  data: {
    message: string;
    response: string;
  };
}

interface WebhookResponse {
  message: string;
  status: string;
  amount: number;
  number: string;
  created: string;
  transid: string;
  reference: string;
}

// API Configuration
const API_BASE_URL = "https://luco-backend.onrender.com/api/v1";
const PAYMENT_API_BASE_URL = "https://lucopay-backend.vercel.app";

// API Functions
const walletAPI = {
  getWallet: async (token: string): Promise<WalletData> => {
    const response = await fetch(`${API_BASE_URL}/account/wallet`, {
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      throw new Error("Failed to fetch wallet data");
    }
    return response.json();
  },

  topUp: async (token: string, data: TopUpRequest): Promise<TopUpResponse> => {
    const response = await fetch(`${API_BASE_URL}/account/wallet/topup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to process top-up");
    }
    return response.json();
  },

  getTransactions: async (
    token: string,
    params?: {
      skip?: number;
      limit?: number;
    }
  ): Promise<Transaction[]> => {
    const queryParams = new URLSearchParams();
    queryParams.append("skip", (params?.skip || 0).toString());
    queryParams.append("limit", (params?.limit || 100).toString());

    const response = await fetch(
      `${API_BASE_URL}/account/wallet/transactions?${queryParams.toString()}`,
      {
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (!response.ok) {
      throw new Error("Failed to fetch transactions");
    }
    return response.json();
  },
};

const paymentAPI = {
  verifyPhone: async (msisdn: string): Promise<PhoneVerificationResponse> => {
    const response = await fetch(`${PAYMENT_API_BASE_URL}/identity/msisdn`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({ msisdn }),
    });
    if (!response.ok) {
      throw new Error("Failed to verify phone number");
    }
    return response.json();
  },

  requestPayment: async (amount: string, number: string, refer: string): Promise<PaymentResponse> => {
    const response = await fetch(`${PAYMENT_API_BASE_URL}/api/v1/request_payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({ amount, number, refer }),
    });
    if (!response.ok) {
      throw new Error("Failed to request payment");
    }
    return response.json();
  },

  checkPaymentStatus: async (reference: string): Promise<WebhookResponse> => {
    const response = await fetch(`${PAYMENT_API_BASE_URL}/api/v1/payment_webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({ reference }),
    });
    if (!response.ok) {
      throw new Error("Failed to check payment status");
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
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [walletData, setWalletData] = React.useState<WalletData | null>(null);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [fetchingWallet, setFetchingWallet] = React.useState(true);
  const [selectedAmount, setSelectedAmount] = React.useState<number | null>(null);
  const [customAmount, setCustomAmount] = React.useState("");
  const [processingTopUp, setProcessingTopUp] = React.useState(false);
  const [authChecked, setAuthChecked] = React.useState(false);

  // Payment flow states
  const [showPhoneDialog, setShowPhoneDialog] = React.useState(false);
  const [phoneNumber, setPhoneNumber] = React.useState("");
  const [verifiedName, setVerifiedName] = React.useState("");
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = React.useState(false);
  const [paymentAmount, setPaymentAmount] = React.useState(0);
  const [paymentReference, setPaymentReference] = React.useState("");
  const [isProcessingPayment, setIsProcessingPayment] = React.useState(false);
  const [paymentStatus, setPaymentStatus] = React.useState<"pending" | "succeeded" | "failed" | null>(null);

  // Check authentication
  React.useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }

    setAuthChecked(true);
  }, [isLoaded, isSignedIn, router]);

  // Fetch wallet data
  const fetchWallet = React.useCallback(async () => {
    if (!authChecked) return;

    try {
      setFetchingWallet(true);
      await new Promise((resolve) => setTimeout(resolve, 300));

      const token = await getToken();
      if (!token) {
        showToast("Error", "Authentication required", "error");
        return;
      }

      const data = await walletAPI.getWallet(token);
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
  }, [authChecked, getToken, showToast]);

  // Fetch transactions
  const fetchTransactions = React.useCallback(async () => {
    if (!authChecked) return;

    try {
      await new Promise((resolve) => setTimeout(resolve, 300));

      const token = await getToken();
      if (!token) {
        showToast("Error", "Authentication required", "error");
        return;
      }

      const data = await walletAPI.getTransactions(token, { limit: 10 });
      setTransactions(data);
    } catch (error) {
      showToast(
        "Error",
        error instanceof Error ? error.message : "Failed to fetch transactions",
        "error"
      );
    }
  }, [authChecked, getToken, showToast]);

  React.useEffect(() => {
    if (authChecked) {
      fetchWallet();
      fetchTransactions();
    }
  }, [authChecked, fetchWallet, fetchTransactions]);

  // Generate unique reference
  const generateReference = () => {
    return `REF${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
  };

  // Format phone number
  const formatPhoneNumber = (phone: string) => {
    // Remove any non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // If it starts with 0, replace with 256
    if (cleaned.startsWith('0')) {
      cleaned = '256' + cleaned.slice(1);
    }
    
    // If it doesn't start with 256, add it
    if (!cleaned.startsWith('256')) {
      cleaned = '256' + cleaned;
    }
    
    return cleaned;
  };

  // Auto-verify phone number when it's complete
  React.useEffect(() => {
    const autoVerifyPhone = async () => {
      if (!phoneNumber || isPhoneVerified || isVerifying) return;

      const formattedPhone = formatPhoneNumber(phoneNumber);
      
      // Only auto-verify when phone number is complete (12 digits)
      if (formattedPhone.length !== 12) return;

      setIsVerifying(true);
      try {
        const result = await paymentAPI.verifyPhone(`+${formattedPhone}`);
        
        if (result.success) {
          setVerifiedName(result.identityname);
          setIsPhoneVerified(true);
          showToast("Success", result.message, "success");
        } else {
          showToast("Error", "Phone verification failed", "error");
        }
      } catch (error) {
        showToast(
          "Error",
          error instanceof Error ? error.message : "Failed to verify phone number",
          "error"
        );
      } finally {
        setIsVerifying(false);
      }
    };

    // Debounce the auto-verify to avoid too many API calls
    const timeoutId = setTimeout(autoVerifyPhone, 500);
    return () => clearTimeout(timeoutId);
  }, [phoneNumber, isPhoneVerified, isVerifying, showToast]);

  // Verify phone number (keep for manual verification if needed)
  const handleVerifyPhone = async () => {
    if (!phoneNumber) {
      showToast("Validation Error", "Please enter your phone number", "warning");
      return;
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);
    
    if (formattedPhone.length !== 12) {
      showToast("Validation Error", "Please enter a valid phone number", "warning");
      return;
    }

    setIsVerifying(true);
    try {
      const result = await paymentAPI.verifyPhone(`+${formattedPhone}`);
      
      if (result.success) {
        setVerifiedName(result.identityname);
        setIsPhoneVerified(true);
        showToast("Success", result.message, "success");
      } else {
        showToast("Error", "Phone verification failed", "error");
      }
    } catch (error) {
      showToast(
        "Error",
        error instanceof Error ? error.message : "Failed to verify phone number",
        "error"
      );
    } finally {
      setIsVerifying(false);
    }
  };

  // Process payment
  const handleProcessPayment = async () => {
    const formattedPhone = formatPhoneNumber(phoneNumber);
    const reference = generateReference();
    setPaymentReference(reference);
    setIsProcessingPayment(true);
    setPaymentStatus("pending");

    try {
      // Request payment
      const paymentResult = await paymentAPI.requestPayment(
        paymentAmount.toString(),
        formattedPhone,
        reference
      );

      showToast("Success", "Payment request sent. Please check your phone to complete the payment.", "success");

      // Poll for payment status
      let attempts = 0;
      const maxAttempts = 30; // Poll for 2 minutes (30 * 4 seconds)
      
      const checkStatus = async () => {
        try {
          const statusResult = await paymentAPI.checkPaymentStatus(reference);
          
          if (statusResult.status === "succeeded") {
            setPaymentStatus("succeeded");
            setIsProcessingPayment(false);
            
            // Credit wallet via backend
            const token = await getToken();
            if (token) {
              await walletAPI.topUp(token, { amount: paymentAmount });
              await fetchWallet();
              await fetchTransactions();
            }
            
            showToast("Success", `Payment successful! UGX ${paymentAmount.toLocaleString()} has been added to your wallet.`, "success");
            
            // Reset and close dialog
            setTimeout(() => {
              setShowPhoneDialog(false);
              resetPaymentFlow();
            }, 2000);
            
          } else if (statusResult.status === "failed") {
            setPaymentStatus("failed");
            setIsProcessingPayment(false);
            showToast("Error", "Payment failed. Please try again.", "error");
            
          } else if (attempts < maxAttempts) {
            attempts++;
            setTimeout(checkStatus, 4000); // Check every 4 seconds
          } else {
            setPaymentStatus("failed");
            setIsProcessingPayment(false);
            showToast("Error", "Payment timeout. Please try again.", "error");
          }
        } catch (error) {
          if (attempts < maxAttempts) {
            attempts++;
            setTimeout(checkStatus, 4000);
          } else {
            setPaymentStatus("failed");
            setIsProcessingPayment(false);
            showToast("Error", "Failed to check payment status", "error");
          }
        }
      };

      // Start polling after 2 seconds
      setTimeout(checkStatus, 2000);

    } catch (error) {
      setIsProcessingPayment(false);
      setPaymentStatus("failed");
      showToast(
        "Error",
        error instanceof Error ? error.message : "Failed to process payment",
        "error"
      );
    }
  };

  // Reset payment flow
  const resetPaymentFlow = () => {
    setPhoneNumber("");
    setVerifiedName("");
    setIsPhoneVerified(false);
    setPaymentAmount(0);
    setPaymentReference("");
    setPaymentStatus(null);
    setSelectedAmount(null);
    setCustomAmount("");
  };

  // Handle preset top-up
  const handlePresetTopUp = (amount: number) => {
    setPaymentAmount(amount);
    setSelectedAmount(amount);
    setShowPhoneDialog(true);
  };

  // Handle custom top-up
  const handleCustomTopUp = () => {
    const amount = parseFloat(customAmount);

    if (!amount || amount <= 0) {
      showToast("Validation Error", "Please enter a valid amount", "warning");
      return;
    }

    if (amount < 100) {
      showToast(
        "Validation Error",
        "Minimum top-up amount is UGX 100",
        "warning"
      );
      return;
    }

    setPaymentAmount(Math.floor(amount));
    setShowPhoneDialog(true);
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
                      onClick={() => handlePresetTopUp(option.amount)}
                    >
                      {option.popular && (
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                          <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                            Popular
                          </span>
                        </div>
                      )}
                      <CardContent className="pt-6 text-center">
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
                      min="100"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Minimum: UGX 100
                  </p>
                  <Button
                    className="w-full"
                    onClick={handleCustomTopUp}
                    disabled={!customAmount}
                  >
                    Submit Top Up
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

        {/* Payment Dialog */}
        <Dialog open={showPhoneDialog} onOpenChange={(open) => {
          if (!open && !isProcessingPayment) {
            setShowPhoneDialog(false);
            resetPaymentFlow();
          }
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Complete Payment</DialogTitle>
              <DialogDescription>
                Verify your phone number to proceed with the payment
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Amount Display */}
              <div className="p-4 bg-primary/5 rounded-lg">
                <p className="text-sm text-muted-foreground">Amount to pay</p>
                <p className="text-2xl font-bold">UGX {paymentAmount.toLocaleString()}</p>
              </div>

              {/* Phone Number Input */}
              {!isPhoneVerified && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="tel"
                      placeholder="0700000000"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="pl-10"
                      disabled={isVerifying}
                    />
                    {isVerifying && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter your MTN or Airtel number (will verify automatically)
                  </p>
                </div>
              )}

              {/* Verified Name Display */}
              {isPhoneVerified && !paymentStatus && (
                <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-900 dark:text-green-100">
                        Phone Verified
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                        {verifiedName}
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        +{formatPhoneNumber(phoneNumber)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Status */}
              {paymentStatus === "pending" && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Processing Payment
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        Please check your phone and enter your PIN to complete the payment
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {paymentStatus === "succeeded" && (
                <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-900 dark:text-green-100">
                        Payment Successful!
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                        Your wallet has been credited with UGX {paymentAmount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {paymentStatus === "failed" && (
                <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-900 dark:text-red-100">
                        Payment Failed
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                        The payment could not be processed. Please try again.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                {!paymentStatus && (
                  <>
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => {
                        setShowPhoneDialog(false);
                        resetPaymentFlow();
                      }}
                      disabled={isProcessingPayment}
                    >
                      Cancel
                    </Button>
                    <Button 
                      className="flex-1"
                      onClick={handleProcessPayment}
                      disabled={!isPhoneVerified || isProcessingPayment}
                    >
                      {isProcessingPayment ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Continue"
                      )}
                    </Button>
                  </>
                )}
                
                {paymentStatus === "failed" && (
                  <Button 
                    className="w-full"
                    onClick={() => {
                      setShowPhoneDialog(false);
                      resetPaymentFlow();
                    }}
                  >
                    Close
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  );
}
