"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { MessageSquare, Phone, QrCode, Unlink, Send, ExternalLink, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface WhatsAppStatusResponse {
  connected: boolean;
  phoneNumber: string | null;
  botReady: boolean;
  botPhone: string | null;
  deepLink: string | null;
}

export function WhatsAppSettingsCard() {
  const { user } = useAuth();
  const [waLoading, setWaLoading] = useState(true);
  const [waConnected, setWaConnected] = useState(false);
  const [userPhone, setUserPhone] = useState("");
  const [inputPhone, setInputPhone] = useState("");
  const [botReady, setBotReady] = useState(false);
  const [botPhone, setBotPhone] = useState<string | null>(null);
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [savingPhone, setSavingPhone] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const fetchWhatsAppStatus = async () => {
    try {
      const res = await api.get<WhatsAppStatusResponse>("/user/whatsapp");
      setWaConnected(res.data.connected);
      setUserPhone(res.data.phoneNumber || "");
      setInputPhone(res.data.phoneNumber || "");
      setBotReady(res.data.botReady);
      setBotPhone(res.data.botPhone);
      setDeepLink(res.data.deepLink);

      if (res.data.deepLink) {
        try {
          const qr = await QRCode.toDataURL(res.data.deepLink, {
            width: 220,
            margin: 1,
            color: { dark: "#0f172a", light: "#ffffff" },
          });
          setQrDataUrl(qr);
        } catch (e) {
          console.error("QR Code Generation Error:", e);
        }
      } else {
        setQrDataUrl(null);
      }
    } catch (error) {
      console.error("Failed to load WhatsApp status:", error);
    } finally {
      setWaLoading(false);
    }
  };

  useEffect(() => {
    fetchWhatsAppStatus();
  }, []);

  const handleSavePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPhone.trim()) {
      toast.error("Please enter a phone number");
      return;
    }
    setSavingPhone(true);
    try {
      const res = await api.post("/user/whatsapp/connect", { phoneNumber: inputPhone.trim() });
      toast.success(res.data.message || "WhatsApp number updated successfully!");
      setWaConnected(true);
      setUserPhone(inputPhone.trim());
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update phone number");
    } finally {
      setSavingPhone(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const res = await api.post("/user/whatsapp/disconnect");
      toast.success(res.data.message || "WhatsApp disconnected successfully");
      setWaConnected(false);
      setUserPhone("");
      setInputPhone("");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to disconnect WhatsApp");
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSendTestMessage = async () => {
    setSendingTest(true);
    try {
      const res = await api.post("/user/whatsapp/test");
      toast.success(res.data.message || "Test message sent successfully!");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to send test message");
    } finally {
      setSendingTest(false);
    }
  };

 

  return (
    <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <MessageSquare size={20} />
            </div>
            <div>
              <CardTitle className="text-white flex items-center gap-2.5">
                WhatsApp Notifications
                {waLoading ? (
                  <Badge variant="outline" className="border-slate-800 text-slate-400">
                    <Loader2 size={10} className="animate-spin mr-1" /> Checking
                  </Badge>
                ) : waConnected ? (
                  <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 gap-1.5 hover:bg-emerald-500/20">
                    <CheckCircle2 size={12} /> Connected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-slate-700 text-slate-400 gap-1.5">
                    <AlertCircle size={12} /> Not Linked
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-slate-400 mt-1">
                Receive instant alarm alerts, task reminders, and job status updates directly on WhatsApp.
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSavePhone} className="space-y-3">
          <Label htmlFor="wa-phone" className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Your WhatsApp Phone Number (with country code)
          </Label>
          <div className="flex gap-2.5">
            <div className="relative flex-1">
              <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                id="wa-phone"
                type="tel"
                placeholder="e.g. 919876543210 or 15551234567"
                value={inputPhone}
                onChange={(e) => setInputPhone(e.target.value)}
                className="pl-10 bg-slate-950/70 border-slate-800 text-white placeholder:text-slate-500 focus-visible:ring-emerald-500/40"
              />
            </div>
            <Button
              type="submit"
              disabled={savingPhone || !inputPhone.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5"
            >
              {savingPhone ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" /> Saving
                </>
              ) : (
                "Save Number"
              )}
            </Button>
          </div>
          <p className="text-[11px] text-slate-400">
            Must include your international country code without spaces or dashes (e.g., <code className="text-emerald-400">91</code> for India, <code className="text-emerald-400">1</code> for US/Canada).
          </p>
        </form>

        {waConnected && (
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-white">Active Link: +{userPhone}</p>
              <p className="text-[11px] text-slate-400">TimeFlow will send notifications to this number.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSendTestMessage}
                disabled={sendingTest}
                className="border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800 font-semibold"
              >
                {sendingTest ? (
                  <>
                    <Loader2 size={14} className="animate-spin mr-1.5" /> Sending...
                  </>
                ) : (
                  <>
                    <Send size={14} className="mr-1.5 text-emerald-400" /> Send Test Message
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="font-semibold"
              >
                {disconnecting ? (
                  <>
                    <Loader2 size={14} className="animate-spin mr-1.5" /> Disconnecting...
                  </>
                ) : (
                  <>
                    <Unlink size={14} className="mr-1.5" /> Disconnect
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        <Separator className="bg-slate-800" />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <QrCode size={14} className="text-emerald-400" /> Quick Link via Bot QR Code
            </Label>
            <span className="text-[11px] text-slate-400">
              Bot status:{" "}
              <span className={botReady ? "text-emerald-400 font-bold" : "text-amber-400 font-semibold"}>
                {botReady ? "Online" : "Initializing..."}
              </span>
              {botPhone ? <span className="text-slate-500"> · +{botPhone}</span> : null}
            </span>
          </div>

          {deepLink ? (
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row items-center gap-5">
              {qrDataUrl ? (
                <div className="p-2.5 rounded-lg bg-white shadow-md shrink-0">
                  <img
                    src={qrDataUrl}
                    alt="Scan to link WhatsApp"
                    className="w-32 h-32 block rounded"
                  />
                </div>
              ) : (
                <div className="w-32 h-32 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                  <Loader2 size={24} className="animate-spin text-slate-500" />
                </div>
              )}

              <div className="space-y-2.5 text-center sm:text-left flex-1">
                <p className="text-sm font-semibold text-white">Scan or click to authenticate instantly</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Scanning this QR code opens WhatsApp with a prefilled <code className="text-emerald-400">link {user?.email} &lt;YOUR_PASSWORD&gt;</code> command already addressed to the TimeFlow Bot. Replace &lt;YOUR_PASSWORD&gt; with your actual password and hit send — that links this chat to your account.
                </p>
                <div>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 font-semibold"
                  >
                    <a href={deepLink} target="_blank" rel="noopener noreferrer">
                      <ExternalLink size={14} className="mr-1.5" /> Open in WhatsApp
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 text-xs text-slate-400 leading-relaxed">
              Enter your phone number above and click <strong>Save Number</strong> to connect your WhatsApp account. If you prefer to authenticate via WhatsApp chat, ensure the bot session is running to generate the instant scan QR code.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
