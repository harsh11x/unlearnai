"use client";

import React from "react";
import { Card } from "../ui/Card";
import { Badge, StatusBadge } from "../ui/Badge";

interface ModelCardProps {
  model: {
    id: number;
    name: string;
    architecture?: string;
    parameterCount?: number;
    status: string;
    createdAt: string;
  };
}

function formatParameterCount(count?: number): string {
  if (!count) return "Unknown";
  if (count >= 1e9) return `${(count / 1e9).toFixed(1)}B`;
  if (count >= 1e6) return `${(count / 1e6).toFixed(1)}M`;
  return count.toLocaleString();
}

export function ModelCard({ model }: ModelCardProps) {
  return (
    <a href={`/models/${model.id}`} className="block hover:shadow-md transition-shadow">
      <Card className="h-full">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{model.name}</h3>
            {model.architecture && (
              <p className="mt-1 text-sm text-gray-500">{model.architecture}</p>
            )}
          </div>
          <StatusBadge status={model.status} />
        </div>
        
        <div className="mt-4 flex flex-wrap gap-2">
          {model.parameterCount && (
            <Badge variant="info">{formatParameterCount(model.parameterCount)} params</Badge>
          )}
          <Badge variant="default">
            {new Date(model.createdAt).toLocaleDateString()}
          </Badge>
        </div>
      </Card>
    </a>
  );
}
