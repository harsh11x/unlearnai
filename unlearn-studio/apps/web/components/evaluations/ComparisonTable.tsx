"use client";

import React from "react";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";

interface ComparisonRow {
  category: string;
  displayName: string;
  scoreBefore: number;
  scoreAfter: number;
  delta: number;
  isTarget?: boolean;
}

interface ComparisonTableProps {
  rows: ComparisonRow[];
  title?: string;
}

export function ComparisonTable({ rows, title = "Results" }: ComparisonTableProps) {
  return (
    <Card title={title}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Capability
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Before
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                After
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Change
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr
                key={row.category}
                className={row.isTarget ? "bg-blue-50" : "hover:bg-gray-50"}
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="font-medium text-gray-900">
                      {row.displayName}
                    </span>
                    {row.isTarget && (
                      <Badge variant="danger" size="sm" >
                        TARGET
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-sm text-gray-600">
                  {(row.scoreBefore * 100).toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-right text-sm text-gray-600">
                  {(row.scoreAfter * 100).toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={`text-sm font-semibold ${
                      row.isTarget
                        ? row.delta < -0.1
                          ? "text-green-600"
                          : "text-red-600"
                        : Math.abs(row.delta) < 0.05
                        ? "text-green-600"
                        : "text-yellow-600"
                    }`}
                  >
                    {row.delta >= 0 ? "+" : ""}
                    {(row.delta * 100).toFixed(1)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
