"use client";

import React from "react";
import { Card } from "../ui/Card";
import { Progress } from "../ui/Progress";
import { StatusBadge } from "../ui/Badge";

interface JobStatusProps {
  job: {
    id: number;
    status: string;
    progress: number;
    currentStep?: string;
    forgetLoss?: number;
    retainLoss?: number;
    gpuUtilization?: number;
    gpuMemoryUsedGb?: number;
    gpuMemoryTotalGb?: number;
    startedAt?: string;
    estimatedRemainingSeconds?: number;
  };
}

export function JobStatus({ job }: JobStatusProps) {
  const formatTime = (seconds?: number): string => {
    if (!seconds) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const elapsed = job.startedAt
    ? Math.floor((Date.now() - new Date(job.startedAt).getTime()) / 1000)
    : 0;

  return (
    <Card>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Job #{job.id}</h3>
            <p className="text-sm text-gray-500">{job.currentStep || "Waiting..."}</p>
          </div>
          <StatusBadge status={job.status} />
        </div>

        {/* Progress */}
        <Progress
          value={job.progress}
          label="Progress"
          color={job.status === "failed" ? "red" : "blue"}
        />

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-xs text-gray-500">Forget Loss</p>
            <p className="text-lg font-semibold text-gray-900">
              {job.forgetLoss?.toFixed(4) || "--"}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Retain Loss</p>
            <p className="text-lg font-semibold text-gray-900">
              {job.retainLoss?.toFixed(4) || "--"}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">GPU Util</p>
            <p className="text-lg font-semibold text-gray-900">
              {job.gpuUtilization ? `${job.gpuUtilization.toFixed(0)}%` : "--"}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">GPU Memory</p>
            <p className="text-lg font-semibold text-gray-900">
              {job.gpuMemoryUsedGb
                ? `${job.gpuMemoryUsedGb.toFixed(1)}/${job.gpuMemoryTotalGb?.toFixed(1)} GB`
                : "--"}
            </p>
          </div>
        </div>

        {/* Timing */}
        <div className="flex justify-between text-sm text-gray-500 border-t pt-4">
          <span>Elapsed: {formatTime(elapsed)}</span>
          <span>Remaining: {formatTime(job.estimatedRemainingSeconds)}</span>
        </div>
      </div>
    </Card>
  );
}
