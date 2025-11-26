"use client";

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import OrderList from '../components/OrderList'; 
import ManualInput from '../components/ManualInput'; 
import { useSocket } from '../hooks/useSocket';
import {STATUS_TABS}from '../constants/data'

const API_URL = `${process.env.NEXT_PUBLIC_API_URL}/api/orders`;

// --- স্ট্যাটাস ট্যাব কনফিগারেশন ---
// const STATUS_TABS = [
//     { key: 'Pending', label: 'পেন্ডিং', color: 'indigo' },
//     { key: 'Confirmed', label: 'কনফার্মড', color: 'green' },
//     { key: 'Call Not Received', label: 'কল ধরেনি', color: 'yellow' },
//     { key: 'Phone Off', label: 'ফোন বন্ধ', color: 'orange' },
//     { key: 'Cancelled', label: 'বাতিল', color: 'red' },
// ];

export default function Dashboard() {
    const [orders, setOrders] = useState([]);
    const [activeStatus, setActiveStatus] = useState('Pending');
    const [loading, setLoading] = useState(true);
    
    // Socket.IO হুক ব্যবহার করে রিয়েল-টাইম আপডেট গ্রহণ
    const { data: socketData } = useSocket(); 

    // --- Core Functions: সমস্ত অর্ডার ফেচ করা ---
    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get(API_URL);
            setOrders(response.data);
        } catch (error) {
            console.error("Error fetching orders:", error);
            // Optionally set an error state here
        } finally {
            setLoading(false);
        }
    }, []);

    // --- State Management: আপডেট বা ডিলিট হ্যান্ডেল করা ---
    const handleOrderUpdate = useCallback((data, actionType = 'UPDATE') => {
        setOrders(prevOrders => {
            if (actionType === 'DELETE') {
                // অর্ডারের id অনুযায়ী ফিল্টার করে সরিয়ে দেওয়া
                return prevOrders.filter(order => order._id !== data); 
            }
            
            // যদি UPDATE হয়
            const index = prevOrders.findIndex(o => o._id === data._id);
            if (index !== -1) {
                // বিদ্যমান অর্ডারটি আপডেট করা
                const newOrders = [...prevOrders];
                newOrders[index] = data;
                return newOrders;
            } else {
                // যদি নতুন অর্ডার হয় (যেমন ManualInput থেকে বা Socket এর মাধ্যমে)
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
            // নতুন ডেটা পেলে (Socket Hook থেকে) তা লিস্টে আপডেট/যোগ করা
            console.log('Applying socket data update...');
            handleOrderUpdate(socketData, 'UPDATE'); 
        }
    }, [socketData, handleOrderUpdate]);
    

    // --- Render Logic ---
    const filteredOrders = orders.filter(order => order.orderStatus === activeStatus);

    // ডাইনামিক বাটন ক্লাস তৈরি
    const getButtonClasses = (status, color) => {
        const base = 'px-4 py-2 font-semibold text-sm rounded-lg transition-colors duration-200';
        const colorMap = {
            'Pending': 'bg-yellow-500 hover:bg-yellow-600',
            'Confirmed': 'bg-green-600 hover:bg-green-700',
            'Call Not Received': 'bg-yellow-600 hover:bg-yellow-700',
            'Phone Off': 'bg-orange-600 hover:bg-orange-700',
            'Cancelled': 'bg-red-600 hover:bg-red-700',
            'indigo': 'bg-indigo-600 hover:bg-indigo-700',
            'green': 'bg-green-600 hover:bg-green-700',
        };
        
        if (activeStatus === status) {
            return `${base} text-white shadow-lg ${colorMap[status] || colorMap[color]}`;
        }
        return `${base} bg-gray-200 text-gray-700 hover:bg-gray-300`;
    };

    return (
        <div className="flex flex-col h-screen overflow-hidden font-sans bg-gray-50">
            
            {/* Header / Status Tabs */}
            <header className="p-3 bg-white border-b border-gray-200 shadow-md flex-shrink-0 z-10">
                <h1 className="text-xl font-extrabold text-indigo-700 mb-2">📦 অর্ডার ড্যাশবোর্ড</h1>
                <div className="flex flex-wrap gap-2">
                    {STATUS_TABS.map(tab => (
                        <button 
                            key={tab.key}
                            onClick={() => setActiveStatus(tab.key)}
                            className={getButtonClasses(tab.key, tab.color)}
                        >
                            {tab.label} ({orders.filter(o => o.orderStatus === tab.key).length})
                        </button>
                    ))}
                </div>
            </header>

            {/* Main Content Area: Order List */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-100 pb-36"> {/* pb-36 for bottom padding above fixed input */}
                {loading ? (
                    <div className="text-center py-10 text-gray-500">
                        <svg className="animate-spin h-8 w-8 text-indigo-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        <p className="mt-3 text-lg">অর্ডার লোড হচ্ছে...</p>
                    </div>
                ) : (
                    <>
                        {filteredOrders.length === 0 && (
                            <div className="text-center py-12 text-gray-500 bg-white rounded-xl shadow-md mt-4">
                                <p className="text-lg font-semibold">এই স্ট্যাটাসে কোনো অর্ডার নেই।</p>
                            </div>
                        )}
                        
                        {/* onOrderUpdate prop টি OrderList এর মাধ্যমে পাস করা হলো */}
                        <OrderList 
                            orders={filteredOrders} 
                            onOrderUpdate={handleOrderUpdate} // স্ট্যাটাস বা ডিলিট আপডেট হ্যান্ডেল করার জন্য
                        /> 
                    </>
                )}
            </div>

            {/* Fixed Bottom Input Area */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-2xl z-20">
                <ManualInput />
            </div>
        </div>
    );
}