import FacebookLiveComments from "@/components/facebook/FacebookLiveComments";
import SearchAndMenu from "@/components/layout/SearchAndMenu";
import AuthGuard from "@/components/auth/AuthGuard";
import React from "react";

function CommentPageContent() {
  return (
    <div className="p-1 md:p-3 bg-white border-b border-gray-200 shadow-md">
      <SearchAndMenu />
      <FacebookLiveComments />
    </div>
  );
}

export default function CommentPage() {
  return (
    <AuthGuard>
      <CommentPageContent />
    </AuthGuard>
  );
}
