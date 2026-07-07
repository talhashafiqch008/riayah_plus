import { memo, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { tokens } from "@/demo/coordinator/tokens";

export const StatusBadge = memo(function StatusBadge({ status }: { status: string }) {
  const config = useMemo(() => ({
    draft: { bg: tokens.colors.background.card, text: tokens.colors.text.secondary, border: "border-l-slate-400" },
    pending_approval: { bg: tokens.colors.background.card, text: "text-amber-700", border: "border-l-amber-500" },
    approved: { bg: tokens.colors.background.card, text: "text-blue-700", border: "border-l-blue-500" },
    active: { bg: tokens.colors.background.card, text: "text-green-700", border: "border-l-green-500" },
    completed: { bg: tokens.colors.background.card, text: tokens.colors.text.muted, border: "border-l-slate-400" },
    pending: { bg: tokens.colors.background.card, text: tokens.colors.text.secondary, border: "border-l-slate-400" },
    assigned: { bg: tokens.colors.background.card, text: "text-blue-700", border: "border-l-blue-500" },
    in_progress: { bg: tokens.colors.background.card, text: "text-amber-700", border: "border-l-amber-500" },
    rejected: { bg: tokens.colors.background.card, text: "text-red-700", border: "border-l-red-500" },
    cancelled: { bg: tokens.colors.background.card, text: tokens.colors.text.secondary, border: "border-l-slate-400" },
  }), []);

  const c = (config as Record<string, { bg: string; text: string; border: string }>)[status] || config.pending;
  return (
    <Badge className={`${c.bg} ${c.text} border-l-4 ${c.border} shadow-sm capitalize font-semibold`}>
      {status.replace("_", " ")}
    </Badge>
  );
});

export const StatCard = memo(function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  color, 
  trend 
}: { 
  icon: LucideIcon; 
  label: string; 
  value: string | number; 
  color: string; 
  trend?: string;
}) {
  return (
    <Card className={`${tokens.colors.border.default} border-l-4 border-l-transparent hover:border-l-4 motion-safe:transition-all duration-300 hover:shadow-lg hover:-translate-y-1`} style={{ borderLeftColor: color }}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: `${color}20` }}>
              <Icon className="w-6 h-6" style={{ color }} />
            </div>
            <div>
              <p className={`text-3xl font-bold ${tokens.colors.text.primary} tracking-tight`}>{value}</p>
              <p className={`text-sm font-medium ${tokens.colors.text.muted}`}>{label}</p>
            </div>
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-sm font-medium ${tokens.colors.accent.green.text} ${tokens.colors.accent.green.bg} px-2 py-1 rounded-full`}>
              <ArrowUpRight className="w-3 h-3" />
              {trend}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

export const ProgressRing = memo(function ProgressRing({ progress, color, size = 60 }: { progress: number; color: string; size?: number }) {
  const { strokeWidth, radius, circumference, offset } = useMemo(() => {
    const strokeWidth = 4;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;
    return { strokeWidth, radius, circumference, offset };
  }, [size, progress]);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-slate-300"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="motion-safe:transition-all motion-safe:duration-1000"
        />
      </svg>
      <span className="absolute text-sm font-bold text-slate-900">{Math.round(progress)}%</span>
    </div>
  );
});

export const LoadingSkeleton = memo(function LoadingSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 bg-slate-200 rounded" style={{ width: `${100 - (i * 10)}%` }} />
      ))}
    </div>
  );
});

export const TabNav = memo(function TabNav({
  tabs,
  activeTab,
  onTabChange,
  variant = "pill",
}: {
  tabs: { id: string; label: string }[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  variant?: "pill" | "underline";
}) {
  if (variant === "underline") {
    return (
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors duration-200 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-t-lg ${
              activeTab === tab.id
                ? "border-blue-600 text-blue-600 bg-blue-50/50"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-1 mb-8 bg-slate-100 p-1 rounded-xl">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-300 ${
            activeTab === tab.id
              ? "bg-white text-blue-700 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
});

export const ProgressBar = memo(function ProgressBar({
  progress,
  color = "bg-blue-500",
  size = "md",
  showLabel = true,
}: {
  progress: number;
  color?: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}) {
  const sizeClasses = {
    sm: "h-2",
    md: "h-3",
    lg: "h-4",
  };

  return (
    <div className="flex items-center gap-3">
      <div className={`flex-1 ${sizeClasses[size]} bg-slate-200 rounded-full overflow-hidden`}>
        <div
          className={`h-full ${color} rounded-full motion-safe:transition-all duration-500`}
          style={{ width: `${progress}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-sm font-semibold text-slate-900">{Math.round(progress)}%</span>
      )}
    </div>
  );
});

export const EmptyState = memo(function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="text-center py-16 px-8">
      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
        <Icon className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 mb-4">{description}</p>
      {action}
    </div>
  );
});
