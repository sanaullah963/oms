"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
// axios import removed as data is mocked for single-file operation

// ====================================================================
// --- মক এবং কনস্ট্যান্টস (Single File requirement এর জন্য) ---
// ====================================================================

const API_URL = "http://mockapi.com"; // মক API URL
const STATUS_TABS = [
  { key: "Pending", label: "পেন্ডিং", color: "Pending" },
  { key: "Confirmed", label: "কনফার্মড", color: "Confirmed" },
  { key: "Call Not Received", label: "কল মিস", color: "yellow" },
  { key: "Phone Off", label: "ফোন বন্ধ", color: "orange" },
  { key: "Cancelled", label: "বাতিল", color: "Cancelled" },
];
const useSocket = () => ({ data: null }); // মক সকেট হুক
const ManualInput = ({ onUpdate }) => ( // মক ManualInput কম্পোনেন্ট
  <div className="p-3 border rounded-lg bg-gray-500 text-center text-sm text-white">
    <p>নতুন অর্ডার যোগ করার মক ইনপুট এলাকা</p>
  </div>
);
const OrderList = ({ orders, onOrderUpdate }) => { // মক OrderList কম্পোনেন্ট
  if (orders.length === 0) return null;
  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <div 
          key={order._id} 
          // স্ট্যাটাস অনুযায়ী ডায়নামিক বর্ডার কালার সেট করা হলো
          className={`p-4 bg-white rounded-xl shadow-md border-l-4 
            ${order.orderStatus === 'Pending' ? 'border-yellow-500' :
              order.orderStatus === 'Confirmed' ? 'border-green-600' :
              order.orderStatus === 'Cancelled' ? 'border-red-600' :
              'border-indigo-400'
            }
          `}
        >
          <p className="text-sm font-bold text-gray-800">{order.castomerName}</p>
          <p className="text-xs text-gray-600">ID: {order._id.substring(0, 8)}... | ফোন: {order.castomerPhone}</p>
          <p className="text-xs text-gray-600">COD: {order.totalCOD} Taka | প্রোডাক্ট: {order.productCode} <span className="text-xs font-semibold ml-2 bg-gray-200 px-2 py-0.5 rounded">{order.orderStatus}</span></p>
        </div>
      ))}
    </div>
  );
};

const MOCK_ORDERS = [
    { _id: "654321abcd", castomerName: "আবির আহমেদ", castomerPhone: "01712345678", castomerAddress: "ঢাকা", totalCOD: 1250, productCode: "PRO-A1", orderStatus: "Pending" },
    { _id: "654322efgh", castomerName: "নুসরাত জাহান", castomerPhone: "01887654321", castomerAddress: "চট্টগ্রাম", totalCOD: 800, productCode: "PRO-B2", orderStatus: "Confirmed" },
    { _id: "654323ijkl", castomerName: "ফাহিম হাসান", castomerPhone: "01990123456", castomerAddress: "খুলনা", totalCOD: 1500, productCode: "PRO-C3", orderStatus: "Pending" },
    { _id: "654324mnop", castomerName: "শারমিন আক্তার", castomerPhone: "01600112233", castomerAddress: "সিলেট", totalCOD: 500, productCode: "PRO-D4", orderStatus: "Call Not Received" },
    { _id: "654325qrst", castomerName: "তানভীর কবির", castomerPhone: "01555443322", orderStatus: "Pending", castomerAddress: "রাজশাহী", totalCOD: 2200, productCode: "PRO-E5" },
    { _id: "654326uvwx", castomerName: "আবির", castomerPhone: "01700998877", orderStatus: "Confirmed", castomerAddress: "বরিশাল", totalCOD: 950, productCode: "PRO-F6" },
    { _id: "654327yzab", castomerName: "নুসরাত", castomerPhone: "01811223344", orderStatus: "Phone Off", castomerAddress: "রংপুর", totalCOD: 1200, productCode: "PRO-G7" },
    { _id: "654328cdef", castomerName: "ফারহানা", castomerPhone: "01723456789", orderStatus: "Cancelled", castomerAddress: "ময়মনসিংহ", totalCOD: 300, productCode: "PRO-H8" },
    { _id: "654329ghij", castomerName: "হাবিব", castomerPhone: "01711223344", orderStatus: "Pending", castomerAddress: "ঢাকা", totalCOD: 450, productCode: "PRO-I9" },
];
// ====================================================================
// --- END MOCK Dependencies ---
// ====================================================================


export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [activeStatus, setActiveStatus] = useState("Pending");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(""); 

  // searchQuery-কে lower case এ পরিবর্তন করে trim করা
  // (ব্যবহারকারী কোড থেকে এখানে আনা হয়েছে, যদিও useMemo এর ভিতরে থাকাই শ্রেয়)
  const query = searchQuery.toLowerCase().trim();

  const { data: socketData } = useSocket(); // মক সকেট হুক ব্যবহার

  // --- Core Functions: সমস্ত অর্ডার ফেচ করা (মক করা) ---
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    // মক ডেটা লোড করার জন্য একটি কৃত্রিম বিলম্ব
    await new Promise(resolve => setTimeout(resolve, 500)); 
    setOrders(MOCK_ORDERS);
    setLoading(false);
    
    // রিয়েল API কল থাকলে, নিচের মতো দেখতে হতো:
    /*
    try {
      const response = await axios.get(`${API_URL}/api/orders`);
      setOrders(response.data);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
    */
  }, []);

  // --- State Management: আপডেট বা ডিলিট হ্যান্ডেল করা ---
  const handleOrderUpdate = useCallback((data, actionType = "UPDATE") => {
    setOrders((prevOrders) => {
      if (actionType === "DELETE") {
        return prevOrders.filter((order) => order?._id !== data);
      }
      const index = prevOrders?.findIndex((o) => o?._id === data?._id);
      if (index !== -1) {
        const newOrders = [...prevOrders];
        newOrders[index] = data;
        return newOrders;
      } else {
        return [data, ...prevOrders];
      }
    });
  }, []);

  // --- Effects: Initial Load ---
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // --- Effects: Socket.IO রিয়েল-টাইম আপডেট ---
  useEffect(() => {
    if (socketData && socketData._id) {
      console.log("Applying socket data update...");
      handleOrderUpdate(socketData, "UPDATE");
    }
  }, [socketData, handleOrderUpdate]);

  // --- চূড়ান্ত Render Logic: সার্চ ওভাররাইড ফিল্টারিং লজিক ---
  const filteredOrders = useMemo(() => {
    const currentQuery = searchQuery.toLowerCase().trim();

    // 1. যদি সার্চ কোয়েরি থাকে, তবে স্ট্যাটাস নির্বিশেষে সকল অর্ডারে সার্চ হবে
    if (currentQuery) {
        return orders.filter((order) => {
            // কোন কোন ফিল্ডে সার্চ করা হবে
            const searchableFields = [
                order._id,
                order.castomerName,
                order.castomerPhone,
                order.productCode,
                order.totalCOD,
            ];

            return searchableFields.some((field) => {
                if (field) {
                    // স্ট্রিং-এ রূপান্তর করে সার্চ করা
                    const fieldStr = String(field).toLowerCase();
                    return fieldStr.includes(currentQuery);
                }
                return false;
            });
        });
    } 
    
    // 2. যদি সার্চ কোয়েরি খালি থাকে, তবে শুধুমাত্র বর্তমান activeStatus অনুযায়ী ফিল্টার করা হবে
    else {
        return orders.filter(
            (order) => order.orderStatus === activeStatus
        );
    }

  }, [orders, activeStatus, searchQuery]); 
  // --- END চূড়ান্ত Render Logic ---


  // ডাইনামিক বাটন ক্লাস তৈরি
  const getButtonClasses = (status, color) => {
    const base =
      "md:px-4 p-1 md:py-2 font-semibold text-sm rounded-md transition-colors duration-200 w-auto flex-shrink-0"; 
    const colorMap = {
      Pending: "bg-yellow-500 hover:bg-yellow-600",
      Confirmed: "bg-green-600 hover:bg-green-700",
      "Call Not Received": "bg-yellow-600 hover:bg-yellow-700",
      "Phone Off": "bg-orange-600 hover:bg-orange-700",
      Cancelled: "bg-red-600 hover:bg-red-700",
      indigo: "bg-indigo-600 hover:bg-indigo-700",
      green: "bg-green-600 hover:bg-green-700",
    };

    if (activeStatus === status) {
      return `${base} text-white shadow-lg ${
        colorMap[status] || colorMap[color]
      }`;
    }
    return `${base} bg-gray-200 text-gray-700 hover:bg-gray-300`;
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden font-sans bg-gray-50">
      
      <header className="p-1 md:p-3 bg-white border-b border-gray-200 shadow-md flex-shrink-0 z-10">
        
        {/* search bar */}
        <div className="flex justify-between items-center mb-2"> 
          
          {/* search bar input box */}
          <div className="flex-1 mr-4">
            <div className="relative">
              <input
                type="text"
                placeholder="নাম, ফোন, বা অর্ডার ID দিয়ে খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 text-sm"
              />
              {/* সার্চ আইকন */}
              <svg 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="currentColor"
              >
                <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM1 10a9 9 0 1118 0 9 9 0 01-18 0zM17.5 17.5l4.5 4.5"/>
              </svg>
            </div>
          </div>
          
          <h1 className="text-lg font-extrabold text-indigo-700 flex-shrink-0 whitespace-nowrap">
            <span> মোট অর্ডার</span>
            <span className="text-green-700 text-2xl ml-2 font-mono">
              {orders?.length}
            </span>
          </h1>
        </div>

        {/* Status Tabs */}
        <div
          className="flex overflow-x-auto w-auto gap-0.5 md:gap-2 whitespace-nowrap"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveStatus(tab.key)}
              className={getButtonClasses(tab.key, tab.color)}
            >
              {/* স্ট্যাটাস কাউন্টিং: এটি সকল অর্ডারের মধ্যে হচ্ছে */}
              {`${tab.label} ${
                orders.filter((o) => o.orderStatus === tab.key).length
              }`}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content Area: Order List */}
      <div className="flex-1 overflow-y-auto p-1.5 md:p-4 bg-gray-100 pb-36">
        {loading ? (
          <div className="text-center py-10 text-gray-500">
            {/* Loading Spinner */}
            <svg className="animate-spin h-8 w-8 text-indigo-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <p className="mt-3 text-lg">অর্ডার লোড হচ্ছে...</p>
          </div>
        ) : (
          <>
            {filteredOrders.length === 0 && (
              <div className="text-center py-12 text-gray-500 bg-white rounded-xl shadow-md mt-4">
                <p className="text-lg font-semibold">
                  {/* সার্চ কোয়েরি থাকলে ভিন্ন মেসেজ, না থাকলে ভিন্ন মেসেজ */}
                  {searchQuery.length > 0 ? 
                    `" ${searchQuery} " এর জন্য কোনো অর্ডার খুঁজে পাওয়া যায়নি।` :
                    `এই স্ট্যাটাসে ( ${STATUS_TABS.find(t => t.key === activeStatus)?.label || activeStatus} ) কোনো অর্ডার নেই।`
                  }
                </p>
              </div>
            )}

            <OrderList
              orders={filteredOrders}
              onOrderUpdate={handleOrderUpdate}
            />
          </>
        )}
      </div>

      {/* Fixed Bottom Input Area */}
      <div className="fixed bottom-0 left-0 right-0 px-1 py-2 bg-white border-t border-gray-200 shadow-2xl z-20">
        <ManualInput onUpdate={handleOrderUpdate} />
      </div>
    </div>
  );
}