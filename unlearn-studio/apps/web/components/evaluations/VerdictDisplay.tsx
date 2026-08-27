"use client";

import React from "react";
import { Card } from "../ui/Card";
import { Progress } from "../ui/Progress";

interface VerdictDisplayProps {
  verdict: "pass" | "pass_with_review" | "fail";
  forgettingScore: number; // 0-1
  retentionScore: number; // 0-1
  collateralDamage: number; // 0-1
  robustnessScore?: number; // 0-1
}

export function VerdictDisplay({
  verdict,
  forgettingScore,
  retentionScore,
  collateralDamage,
  robustnessScore,
}: VerdictDisplayProps) {
  const verdictConfig = {
    pass: {
      label: "PASS",
      color: "text-green-600",
      bg: "bg-green-50 border-green-200",
      description: "Target capability was successfully reduced while retaining unrelated capabilities.",
    },
    pass_with_review: {
      label: "PASS WITH REVIEW",
      color: "text-yellow-600",
      bg: "bg-yellow-50 border-yellow-200",
      description: "Partial unlearning achieved. Review the results for potential improvements.",
    },
    fail: {
      label: "FAIL",
      color: "text-red-600",
      bg: "bg-red-50 border-red-200",
      description: "Unlearning did not meet the required thresholds. Consider adjusting parameters.",
    },
  };

  const config = verdictConfig[verdict];

  return (
    <Card>
      {/* Verdict Banner */}
      <div className={`p-6 rounded-lg border-2 ${config.bg} mb-6`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-2xl font-bold ${config.color}`}>{config.label}</h2>
            <p className="mt-1 text-sm text-gray-600">{config.description}</p>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Forgetting Score */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-gray-700">Forgetting</span>
            <span className="font-semibold text-gray-900">
              {(forgettingScore * 100).toFixed(0)}%
            </span>
          </div>
          <Progress
            value={forgettingScore * 100}
            color="red"
            showValue={false}
            size="md"
          />
          <p className="text-xs text-gray-500">
            How much the target capability was reduced
          </p>
        </div>

        {/* Retention Score */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-gray-700">Retention</span>
            <span className="font-semibold text-gray-900">
              {(retentionScore * 100).toFixed(0)}%
            </span>
          </div>
          <Progress
            value={retentionScore * 100}
            color="green"
            showValue={false}
            size="md"
          />
          <p className="text-xs text-gray-500">
            How well unrelated capabilities were preserved
          </p>
        </div>

        {/* Collateral Damage */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-gray-700">Collateral Damage</span>
            <span
              className={`font-semibold ${
                collateralDamage < 0.05
                  ? "text-green-600"
                  : collateralDamage < 0.15
                  ? "text-yellow-600"
                  : "text-red-600"
              }`}
            >
              {collateralDamage < 0.05
                ? "LOW"
                : collateralDamage < 0.15
                ? "MEDIUM"
                : "HIGH"}
            </span>
          </div>
          <Progress
            value={collateralDamage * 100}
            color={collateralDamage < 0.05 ? "green" : collateralDamage < 0.15 ? "yellow" : "red"}
            showValue={false}
            size="md"
          />
          <p className="text-xs text-gray-500">
            Unintended degradation of unrelated capabilities
          </p>
        </div>

        {/* Robustness */}
        {robustnessScore !== undefined && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-700">Robustness</span>
              <span className="font-semibold text-gray-900">
                {robustnessScore < 0.3
                  ? "HIGH"
                  : robustnessScore < 0.6
                  ? "MEDIUM"
                  : "LOW"}
              </span>
            </div>
            <Progress
              value={(1 - robustnessScore) * 100}
              color="blue"
              showValue={false}
              size="md"
            />
            <p className="text-xs text-gray-500">
              Resistance to prompt rewording
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
