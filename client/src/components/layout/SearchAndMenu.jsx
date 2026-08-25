"use client";
import { useOrders } from "@/context/OrderContext";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import React, { useState } from "react";
import { usePathname } from 'next/navigation'

function SearchAndMenu() {
  const { searchQuery, setSearchQuery, inportantNotes } = useOrders();
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const countAttention = inportantNotes.length;
  const pathname = usePathname()
  const menueItems = [
    { title: "Home", link: "/" },
    { title: "📊 Dashboard", link: "/dashboard" },
    { title: "Note", link: "/note" },
    { title: "Comment", link: "/comment" },
    ...(user?.role === "admin"
      ? [
          { title: "🚫 ব্লক কাস্টমার", link: "/dashboard/blocked-customers" },
          { title: "📈 সেশন অ্যানালিটিক্স", link: "/dashboard/sessions" },
          { title: "📈 Event logs", link: "/dashboard/event-logs" },
        ]
      : []),
  ];


  return (
    <div>
      <div className="flex justify-between ">
        {/* Search bar */}
        <div className="flex-1 mr-4">
          <div className="relative">
            <input
              type="text"
              placeholder="নাম, ফোন, বা অর্ডার ID দিয়ে খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-2 py-1 border border-gray-300 rounded-md focus:ring-indigo-200 focus:border-indigo-200 transition duration-11 text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                className="absolute inset-y-0 right-0 my-0.5 flex items-center text-gray-100 bg-red-400 rounded-md px-2"
                onClick={() => setSearchQuery("")}
              >
                X
              </button>
            )}
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="cursor-pointer relative bg-green-700 px-3 py-1 text-green-100 mb-1 md:mb-2 rounded-sm flex items-center gap-2"
          >
            {/* Animated Hamburger */}
            <div className="relative w-6 h-6 flex items-center justify-center">
              <span
                className={`absolute h-0.5 w-5 bg-white transition-all duration-300 ${
                  isMenuOpen ? "rotate-45" : "-translate-y-1.5"
                }`}
              />
              <span
                className={`absolute h-0.5 w-5 bg-white transition-all duration-300 ${
                  isMenuOpen ? "opacity-0" : "opacity-100"
                }`}
              />
              <span
                className={`absolute h-0.5 w-5 bg-white transition-all duration-300 ${
                  isMenuOpen ? "-rotate-45" : "translate-y-1.5"
                }`}
              />
            </div>

            <span>Menu</span>

            {countAttention > 0 && (
              <span className="absolute -top-1.5 -left-1.5 bg-red-500 text-white text-xs font-bold rounded-lg w-5 h-5 flex items-center justify-center leading-none">
                {countAttention}
              </span>
            )}
          </button>

          {isMenuOpen && (
            <div className="fled flex-col absolute right-0 mt-1 w-52 bg-white border border-gray-200 rounded-md shadow-lg z-50 animate-in fade-in zoom-in duration-200">
              {user && (
                <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100 m-2 mb-0">
                  👤 {user.name}{" "}
                  <span className="text-gray-400">({user.role})</span>
                </div>
              )}

              {menueItems.map((item, index) => (
                <Link
                  key={index}
                  href={item.link}
                  className={`px-4 py-2 border border-green-500 bg-green-300 rounded-md hover:bg-green-200 m-2 flex items-center justify-start gap-2 ${pathname === item.link && "bg-indigo-400"} `}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.title}
                  {item.title === "Note" && countAttention > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold rounded-sm w-6 h-6 flex items-center justify-center leading-none">
                      {countAttention}
                    </span>
                  )}
                </Link>
              ))}
              
              <button
                className="w-full text-left px-4 py-2  hover:bg-red-100 text-red-600 cursor-pointer"
                onClick={() => {
                  setIsMenuOpen(false);
                  logout();
                }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SearchAndMenu; 