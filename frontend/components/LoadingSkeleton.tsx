"use client";

import React from "react";

interface LoadingSkeletonProps {
  rows?: number;
  showHeader?: boolean;
}

export function LoadingSkeleton({ rows = 5, showHeader = true }: LoadingSkeletonProps) {
  return (
    <div className="space-y-4 animate-pulse">
      {showHeader && (
        <div className="space-y-2">
          <div className="h-8 w-64 bg-purple-100 rounded-lg" />
          <div className="h-4 w-96 bg-purple-50 rounded-lg" />
        </div>
      )}
      <div className="bg-white rounded-2xl shadow-sm border border-purple-100 overflow-hidden">
        <div className="p-4 space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-4 w-16 bg-purple-50 rounded" />
              <div className="h-4 flex-1 bg-purple-50 rounded" />
              <div className="h-4 w-20 bg-purple-50 rounded" />
              <div className="h-4 w-16 bg-purple-50 rounded" />
              <div className="h-6 w-14 bg-purple-100 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl shadow-sm border border-purple-100 p-6 space-y-3">
          <div className="h-5 w-3/4 bg-purple-50 rounded" />
          <div className="h-4 w-full bg-purple-50 rounded" />
          <div className="h-4 w-2/3 bg-purple-50 rounded" />
          <div className="flex gap-2 mt-2">
            <div className="h-8 w-20 bg-purple-100 rounded-lg" />
            <div className="h-8 w-20 bg-purple-100 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
