"use client";
import React from "react";
import { dahsbOrderActionButton } from "@/constants/orderConstants";
import { copyToClipboard } from "@/utils/copyToClipboard";

const MAX_LABEL_LENGTH = 18;

// বাটনের হেডিংয়ে জেনেরিক লেবেলের বদলে যেই টেক্সট কপি হবে তার প্রথম কিছু অংশ দেখানো হয়
function truncateLabel(text = "") {
  const trimmed = text.trim();
  return trimmed.length > MAX_LABEL_LENGTH
    ? `${trimmed.slice(0, MAX_LABEL_LENGTH)}…`
    : trimmed;
}

// আগে প্রতিটা NoteBubble-এর ভেতরে আলাদাভাবে এই কপি বাটনগুলো (কল ধরেনি/ফোন বন্ধ/Assigned)
// থাকত — এখন এখানে, নোট লিস্টের সবার উপরে, একবারে দেখানো হয়। দরকার হলে এখান
// থেকে ক্লিক করে কপি করে নেওয়া যাবে।
function NoteQuickCopyBar() {
  return (
    <div className="flex flex-wrap gap-2 bg-white border border-gray-200 rounded-lg p-2 mb-2 shadow-sm">
      {dahsbOrderActionButton.map((shortcut, index) => (
        <button
          key={index}
          onClick={() => copyToClipboard(shortcut.value)}
          title={shortcut.value}
          className="text-gray-700 text-xs font-medium py-1.5 px-3 rounded-lg shadow-md transition duration-200 cursor-pointer bg-yellow-400 hover:bg-gray-300 hover:shadow-lg"
        >
          {truncateLabel(shortcut.value)}
        </button>
      ))}
    </div>
  );
}

export default NoteQuickCopyBar;