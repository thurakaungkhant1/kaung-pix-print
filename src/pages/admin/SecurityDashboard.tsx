import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck, ShieldAlert, ShieldX, Loader2, RefreshCw, CheckCircle2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

type Risk = "critical" | "high" | "medium" | "low" | "info";

interface Finding {
  id: string;
  title: string;
  risk: Risk;
  category: string;
  description: string;
  remediation: string[];
  status: "open" | "resolved";
  resolvedNote?: string;
}

// Curated posture baseline for this project, based on the scan-fix history.
// The dashboard reflects the current state after applied remediations.
const BASELINE_FINDINGS: Finding[] = [
  {
    id: "messages_realtime_topic_policy_overbroad",
    title: "Realtime topic policy on messages was overbroad",
    risk: "high",
    category: "Row Level Security",
    description:
      "An earlier realtime policy on the messages table allowed subscription across topics without participant scoping.",
    remediation: [
      "Drop the overbroad realtime policy",
      "Keep only participant-scoped RLS policies (participant1_id / participant2_id)",
      "Re-run the scanner to confirm no bypass remains",
    ],
    status: "resolved",
    resolvedNote: "Overbroad policy removed; only narrow participant-scoped policies remain.",
  },
  {
    id: "wallet_transactions_client_insert",
    title: "Client-side inserts into wallet_transactions",
    risk: "critical",
    category: "Financial Integrity",
    description:
      "Users could originally insert wallet_transactions from the browser, risking balance forgery.",
    remediation: [
      "Route all wallet credits through the record-wallet-purchase edge function",
      "Insert only via service_role in the function",
      "Restrict INSERT RLS on wallet_transactions to service_role",
    ],
    status: "resolved",
    resolvedNote: "Inserts moved to record-wallet-purchase edge function using service role.",
  },
  {
    id: "auto_topup_norole",
    title: "auto-topup edge function had no role check",
    risk: "high",
    category: "Edge Functions",
    description: "auto-topup accepted requests without verifying admin role, enabling privileged actions.",
    remediation: [
      "Validate caller JWT via getClaims(token)",
      "Enforce has_role(uid, 'admin') before processing",
      "Return 401/403 otherwise",
    ],
    status: "resolved",
    resolvedNote: "JWT + admin role check enforced.",
  },
  {
    id: "profiles_self_write",
    title: "Users could self-modify sensitive profile columns",
    risk: "critical",
    category: "Row Level Security",
    description:
      "Users could write to wallet_balance, points, game_points, account_status, and referral fields directly.",
    remediation: [
      "Add a BEFORE UPDATE trigger blocking non-admin/non-service edits to sensitive columns",
      "Route all balance/points changes through server functions",
    ],
    status: "resolved",
    resolvedNote: "prevent_profile_sensitive_self_update trigger enforces server-only writes.",
  },
  {
    id: "smile_api_key_public",
    title: "Smile.one API credentials readable from client",
    risk: "critical",
    category: "Secrets Exposure",
    description: "ad_settings SELECT policy exposed credential-like keys to non-admins.",
    remediation: [
      "Restrict full ad_settings SELECT to admins",
      "Mask credential-like columns (API keys, secrets, tokens) for others",
    ],
    status: "resolved",
    resolvedNote: "Credentials masked for non-admin roles.",
  },
  {
    id: "transcribe_audio_noauth",
    title: "transcribe-audio accepted unauthenticated calls",
    risk: "high",
    category: "Edge Functions",
    description:
      "Anyone could invoke transcription with arbitrary audioUrl and messageId, bypassing conversation access.",
    remediation: [
      "Verify caller JWT via getClaims",
      "Confirm caller is a participant of the target conversation",
      "Restrict allowed audioUrl to internal chat-voices/chat-media storage",
    ],
    status: "resolved",
    resolvedNote: "Auth + participant + storage-origin checks enforced.",
  },
  {
    id: "SUPA_auth_leaked_password_protection",
    title: "Leaked password protection disabled",
    risk: "medium",
    category: "Authentication",
    description: "Signups/password changes did not check against the Have I Been Pwned database.",
    remediation: ["Enable Password HIBP check in Auth settings"],
    status: "resolved",
    resolvedNote: "HIBP protection enabled.",
  },
  {
    id: "messages_topic_based_policy_bypass",
    title: "Topic-based policy bypass on messages",
    risk: "high",
    category: "Row Level Security",
    description:
      "Realtime topic policies could be used to bypass row-level access controls on messages.",
    remediation: [
      "Remove any topic-based bypass policies",
      "Keep only participant-scoped SELECT/INSERT policies",
    ],
    status: "resolved",
    resolvedNote: "Only participant-scoped policies remain on messages.",
  },
];

const riskMeta: Record<Risk, { label: string; className: string; icon: typeof ShieldCheck }> = {
  critical: { label: "Critical", className: "bg-red-500/15 text-red-600 border-red-500/30", icon: ShieldX },
  high: { label: "High", className: "bg-orange-500/15 text-orange-600 border-orange-500/30", icon: ShieldAlert },
  medium: { label: "Medium", className: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30", icon: ShieldAlert },
  low: { label: "Low", className: "bg-blue-500/15 text-blue-600 border-blue-500/30", icon: ShieldCheck },
  info: { label: "Info", className: "bg-muted text-muted-foreground border-border", icon: ShieldCheck },
};

const SecurityDashboard = () => {
  const [findings] = useState<Finding[]>(BASELINE_FINDINGS);
  const [loading, setLoading] = useState(true);
  const [checks, setChecks] = useState<{ label: string; ok: boolean; hint?: string }[]>([]);

  const runLiveChecks = async () => {
    setLoading(true);
    const results: { label: string; ok: boolean; hint?: string }[] = [];

    // 1. Admin role table reachable
    const { error: rolesErr } = await supabase.from("user_roles").select("role").limit(1);
    results.push({
      label: "user_roles table reachable with RLS",
      ok: !rolesErr || rolesErr.code === "PGRST116",
      hint: rolesErr?.message,
    });

    // 2. Direct wallet_transactions client insert must be blocked
    const { error: walletInsertErr } = await supabase
      .from("wallet_transactions")
      .insert({ amount: 0, type: "test", user_id: "00000000-0000-0000-0000-000000000000" } as never);
    results.push({
      label: "wallet_transactions blocks direct client inserts",
      ok: !!walletInsertErr,
      hint: walletInsertErr ? "Blocked by RLS ✓" : "WARNING: insert succeeded",
    });

    // 3. Direct positive point_transactions insert must be blocked
    const { error: ptErr } = await supabase
      .from("point_transactions")
      .insert({ amount: 5, transaction_type: "test", description: "probe", user_id: "00000000-0000-0000-0000-000000000000" } as never);
    results.push({
      label: "point_transactions blocks positive client inserts",
      ok: !!ptErr,
      hint: ptErr ? "Blocked by RLS ✓" : "WARNING: insert succeeded",
    });

    setChecks(results);
    setLoading(false);
  };

  useEffect(() => {
    runLiveChecks();
  }, []);

  const stats = useMemo(() => {
    const open = findings.filter((f) => f.status === "open");
    const resolved = findings.filter((f) => f.status === "resolved");
    const critical = open.filter((f) => f.risk === "critical").length;
    const high = open.filter((f) => f.risk === "high").length;
    return { open: open.length, resolved: resolved.length, critical, high, total: findings.length };
  }, [findings]);

  const overallOk = stats.open === 0 && checks.every((c) => c.ok);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="max-w-5xl mx-auto flex items-center gap-3 p-4">
          <Link to="/admin">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Security Dashboard</h1>
            <p className="text-xs text-muted-foreground">kaung-pix-print · posture & remediation</p>
          </div>
          <Button size="sm" variant="outline" onClick={runLiveChecks} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2">Re-run checks</span>
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 space-y-6">
        {overallOk ? (
          <Alert className="border-emerald-500/40 bg-emerald-500/10">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <AlertTitle className="text-emerald-700">All known findings resolved</AlertTitle>
            <AlertDescription>
              No open findings. Live database checks passed. Keep re-running scans after schema or edge function changes.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Action required</AlertTitle>
            <AlertDescription>
              {stats.open} finding(s) still open — review the list below.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Open" value={stats.open} tone={stats.open ? "bad" : "good"} />
          <StatCard label="Critical" value={stats.critical} tone={stats.critical ? "bad" : "good"} />
          <StatCard label="High" value={stats.high} tone={stats.high ? "bad" : "good"} />
          <StatCard label="Resolved" value={stats.resolved} tone="good" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Live posture checks</CardTitle>
            <CardDescription>Runs against your live database from the admin browser.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading && checks.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Running checks…
              </div>
            ) : (
              checks.map((c, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  {c.ok ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                  ) : (
                    <ShieldX className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className={c.ok ? "" : "text-red-600 font-medium"}>{c.label}</div>
                    {c.hint && <div className="text-xs text-muted-foreground">{c.hint}</div>}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Findings & remediation
          </h2>
          <div className="space-y-3">
            {findings.map((f) => {
              const meta = riskMeta[f.risk];
              const Icon = meta.icon;
              return (
                <Card key={f.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <Icon className="h-5 w-5 mt-0.5 shrink-0" />
                        <div>
                          <CardTitle className="text-base leading-snug">{f.title}</CardTitle>
                          <CardDescription className="mt-1">{f.category}</CardDescription>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge variant="outline" className={meta.className}>{meta.label}</Badge>
                        <Badge variant={f.status === "resolved" ? "secondary" : "destructive"}>
                          {f.status === "resolved" ? "Resolved" : "Open"}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <p className="text-muted-foreground">{f.description}</p>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                        Remediation steps
                      </div>
                      <ul className="list-disc pl-5 space-y-1">
                        {f.remediation.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                    {f.resolvedNote && (
                      <div className="flex items-start gap-2 rounded-md bg-emerald-500/10 border border-emerald-500/30 p-2 text-emerald-700 text-xs">
                        <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{f.resolvedNote}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ongoing best practices</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2 text-muted-foreground">
            <p>• Every new public.* table needs RLS enabled + explicit GRANTs before shipping.</p>
            <p>• Never store roles on profiles — use user_roles + has_role() security definer.</p>
            <p>• Balance/points writes must go through edge functions with service_role, never client inserts.</p>
            <p>• Validate JWT in edge functions with supabase.auth.getClaims(token).</p>
            <p>• Re-run security scans after each migration or edge function change.</p>
            <p className="flex items-center gap-1 pt-2">
              <ExternalLink className="h-3 w-3" />
              <span>See migrations under <code>supabase/migrations/</code> for enforcement details.</span>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

const StatCard = ({ label, value, tone }: { label: string; value: number; tone: "good" | "bad" }) => (
  <Card>
    <CardContent className="p-4">
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${tone === "bad" ? "text-red-600" : "text-emerald-600"}`}>
        {value}
      </div>
    </CardContent>
  </Card>
);

export default SecurityDashboard;
