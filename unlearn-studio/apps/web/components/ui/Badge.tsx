"use client";

import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  size?: "sm" | "md";
}

export function Badge({ children, variant = "default", size = "sm" }: BadgeProps) {
  const variantClasses = {
    default: "bg-gray-100 text-gray-800",
    success: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
    danger: "bg-red-100 text-red-800",
    info: "bg-blue-100 text-blue-800",
  };

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${variantClasses[variant]} ${sizeClasses[size]}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const variantMap: Record<string, "success" | "warning" | "danger" | "info" | "default"> = {
    ready: "success",
    completed: "success",
    pass: "success",
    running: "info",
    evaluating: "info",
    pending: "default",
    uploading: "warning",
    validating: "warning",
    pass_with_review: "warning",
    error: "danger",
    failed: "danger",
    fail: "danger",
  };

  return <Badge variant={variantMap[status] || "default"}>{status}</Badge>;
}
