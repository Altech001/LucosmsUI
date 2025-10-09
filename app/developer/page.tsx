"use client";

import * as React from "react";
import { PageLayout } from "@/components/page-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/breadcrumb";
import { Plus, Copy, Eye, EyeOff, Trash2, Key, Calendar, Activity, AlertCircle, CheckCircle2, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

interface ApiKeyResponse {
  created: string;
  lastUsed: string;
  name: string;
  id: number;
  key: string;
  full_key: string;
  is_active: boolean;
}

interface ApiKey {
  id: string;
  key: string;
  full_key: string;
  is_active: boolean;
  name?: string;
  created?: string;
  lastUsed?: string;
  status: "active" | "inactive";
}

export default function DeveloperPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const router = useRouter()
  const [apiKeys, setApiKeys] = React.useState<ApiKey[]>([]);
  const [visibleKeys, setVisibleKeys] = React.useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [authChecked, setAuthChecked] = React.useState(false);

  React.useEffect(() => {
    if (!isLoaded) return

    if (!isSignedIn) {
      router.push("/sign-in")
      return
    }

    setAuthChecked(true)
  }, [isLoaded, isSignedIn, router])

  React.useEffect(() => {
    if (authChecked) {
      fetchApiKeys();
    }
  }, [authChecked]);

  const fetchApiKeys = async () => {
    setLoading(true);
    setError(null);
    const retries = 3;
    
    for (let i = 0; i < retries; i++) {
      try {
        // Exponential backoff: 500ms, 1500ms, 3500ms
        const delay = i === 0 ? 500 : 500 * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        const token = await getToken();
        if (!token) {
          if (i < retries - 1) {
            continue;
          }
          setError("Authentication required - please sign in again");
          setLoading(false);
          return;
        }

        const response = await fetch("https://luco-backend.onrender.com/api/v1/api_key/list", {
          method: "GET",
          headers: {
            "Accept": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        });
        
        if (!response.ok) {
          const errorMsg = `Failed to fetch API keys: ${response.status} ${response.statusText}`;
          throw new Error(errorMsg);
        }
        
        const data: ApiKeyResponse[] = await response.json();
        setApiKeys(
          data.map((key) => ({
            id: key.id.toString(),
            key: key.key,
            full_key: key.full_key,
            is_active: key.is_active,
            name: key.name || `Prod API Key ${key.id}`,
            created: key.created || "Unknown",
            lastUsed: key.lastUsed || "Never",
            status: key.is_active ? "active" : "inactive",
          }))
        );
        setError(null);
        setLoading(false);
        return;
      } catch (err) {
        if (i === retries - 1) {
          const errorMessage = err instanceof Error ? err.message : "Error fetching API keys";
          setError(errorMessage);
          setLoading(false);
        }
      }
    }
  };

  const generateApiKey = async () => {
    setLoading(true);
    setError(null);
    const retries = 3;
    
    for (let i = 0; i < retries; i++) {
      try {
        // Exponential backoff: 500ms, 1500ms, 3500ms
        const delay = i === 0 ? 500 : 500 * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        const token = await getToken();
        if (!token) {
          if (i < retries - 1) {
            continue;
          }
          setError("Authentication required - please sign in again");
          setLoading(false);
          return;
        }

        const response = await fetch("https://luco-backend.onrender.com/api/v1/api_key/generate", {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({}),
        });
        
        if (!response.ok) {
          const errorMsg = `Failed to generate API key: ${response.status} ${response.statusText}`;
          throw new Error(errorMsg);
        }
        
        await fetchApiKeys();
        setLoading(false);
        return;
      } catch (err) {
        if (i === retries - 1) {
          const errorMessage = err instanceof Error ? err.message : "Error generating API key";
          setError(errorMessage);
          setLoading(false);
        }
      }
    }
  };

  const deleteApiKey = async (id: string) => {
    if (!confirm("Are you sure you want to delete this API key? This action cannot be undone.")) return;
    setLoading(true);
    setError(null);
    const retries = 3;
    
    for (let i = 0; i < retries; i++) {
      try {
        // Exponential backoff: 500ms, 1500ms, 3500ms
        const delay = i === 0 ? 500 : 500 * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        const token = await getToken();
        if (!token) {
          if (i < retries - 1) {
            continue;
          }
          setError("Authentication required - please sign in again");
          setLoading(false);
          return;
        }

        const response = await fetch(`https://luco-backend.onrender.com/api/v1/api_key/delete/${id}`, {
          method: "DELETE",
          headers: {
            "Accept": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        });
        
        if (!response.ok) {
          const errorMsg = `Failed to delete API key: ${response.status} ${response.statusText}`;
          throw new Error(errorMsg);
        }
        
        await fetchApiKeys();
        setLoading(false);
        return;
      } catch (err) {
        if (i === retries - 1) {
          const errorMessage = err instanceof Error ? err.message : "Error deleting API key";
          setError(errorMessage);
          setLoading(false);
        }
      }
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(keyId)) {
        newSet.delete(keyId);
      } else {
        newSet.add(keyId);
      }
      return newSet;
    });
  };

  const copyToClipboard = (key: string, keyId: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const maskKey = (key: string) => {
    return key.slice(0, 12) + "•".repeat(20) + key.slice(-4);
  };

  if (!isLoaded || !authChecked) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <div className="mx-auto max-w-7xl space-y-8 py-8">
        <Breadcrumb items={[{ label: "Dashboard", href: "/" }, { label: "Developer Keys" }]} />
        
        {/* Header Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-none shadow-blue-500/30">
              <Key className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Developer API Keys</h1>
              <p className="text-sm text-slate-600">Manage and monitor your application access tokens</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="overflow-hidden border-slate-200 bg-white shadow-none transition-all hover:shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-600">Total Keys</p>
                  <p className="text-3xl font-bold text-slate-900">{apiKeys.length}</p>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600">
                  <Key className="h-7 w-7 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-slate-200 bg-white shadow-none transition-all hover:shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-600">Active Keys</p>
                  <p className="text-3xl font-bold text-slate-900">{apiKeys.filter((k) => k.is_active).length}</p>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600">
                  <CheckCircle2 className="h-7 w-7 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-slate-200 shadow-none bg-white transition-all hover:shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-600">API Calls Today</p>
                  <p className="text-3xl font-bold text-slate-900">12.5K</p>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600">
                  <Activity className="h-7 w-7 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Section */}
        <Card className="border-slate-200 bg-white shadow-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-slate-900">Generate New API Key</h3>
                <p className="text-sm text-slate-600">Create a new access token for your application</p>
              </div>
              <Button 
                onClick={generateApiKey} 
                disabled={loading}
                className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 shadow-sm shadow-blue-500/30 transition-all hover:shadow-xl hover:shadow-blue-500/40"
              >
                <Plus className="h-4 w-4" />
                Generate Key
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* API Keys List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Avaliable API Keys</h2>
            {loading && <div className="text-sm text-slate-600">Loading...</div>}
          </div>

          {apiKeys.length === 0 && !loading ? (
            <Card className="border-dashed border-slate-300 bg-slate-50 shadow-none">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-200">
                  <Key className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">No API keys yet</h3>
                <p className="mt-1 text-sm text-slate-600">Generate your first API key to get started</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((apiKey) => (
                <Card key={apiKey.id} className="overflow-hidden border-slate-200 bg-white shadow-none transition-all hover:shadow-md">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold text-slate-900">{apiKey.name}</h3>
                            <Badge
                              className={cn(
                                "rounded-full px-3 py-1 text-xs font-medium",
                                apiKey.is_active
                                  ? "bg-green-100 text-green-700"
                                  : "bg-slate-100 text-slate-700"
                              )}
                            >
                              {apiKey.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-6 text-sm text-slate-600">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-4 w-4" />
                              Created {apiKey.created}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Activity className="h-4 w-4" />
                              Last used {apiKey.lastUsed}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => deleteApiKey(apiKey.id)}
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex-1 rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-sm text-slate-900">
                          {visibleKeys.has(apiKey.id) ? apiKey.full_key : maskKey(apiKey.full_key)}
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-12 w-12 border-slate-200 hover:bg-slate-50"
                          onClick={() => toggleKeyVisibility(apiKey.id)}
                        >
                          {visibleKeys.has(apiKey.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-12 w-12 border-slate-200 hover:bg-slate-50"
                          onClick={() => copyToClipboard(apiKey.full_key, apiKey.id)}
                        >
                          {copiedKey === apiKey.id ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Security Notice */}
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
          <CardContent className="p-6">
            <div className="flex gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-amber-900">Security Best Practices</h3>
                <p className="text-sm leading-relaxed text-amber-800">
                  Never expose your API keys in client-side code, public repositories, or share them via unsecured channels. 
                  If you suspect a key has been compromised, delete it immediately and generate a replacement.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}