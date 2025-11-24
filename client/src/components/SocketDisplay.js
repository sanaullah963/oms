'use client'; // ⬅️ সকেট, হুক এবং ইন্টারেক্টিভিটির জন্য আবশ্যক

import { useSocket } from '../hooks/useSocket'; // ⬅️ এখানে আপনি হুকটি ইমপোর্ট করেছেন

export default function SocketDisplay() {
    // useSocket হুক থেকে ডেটা গ্রহণ
    const { socket, isConnected, data } = useSocket();

    // সার্ভারে মেসেজ পাঠানোর ফাংশন
    const sendMessage = () => {
        if (socket) {
            socket.emit('clientMessage', 'Hello from Next.js Client!');
        }
    };

    return (
        <div className="p-5 border-2 border-indigo-500 rounded-xl shadow-lg bg-white mb-6 transition-all duration-300">
            
            <h3 className="text-lg font-bold text-indigo-700 mb-3">
                🌐 Socket.IO স্ট্যাটাস (ক্লায়েন্ট কম্পোনেন্ট)
            </h3>
            
            {/* কানেকশন স্ট্যাটাস */}
            <p className="mb-2 text-sm">
                <span className="font-semibold text-gray-600">কানেকশন স্ট্যাটাস:</span>
                <span className={`ml-2 px-3 py-1 rounded-full text-xs font-bold ${isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {isConnected ? 'Connected ✅' : 'Disconnected ❌'}
                </span>
            </p>
            
            {/* সার্ভার থেকে প্রাপ্ত ডেটা */}
            {data && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs font-medium text-gray-600 mb-1">সার্ভার থেকে প্রাপ্ত শেষ ডেটা:</p>
                    <code className="block text-gray-800 break-all text-sm">
                        {JSON.stringify(data, null, 2)}
                    </code>
                </div>
            )}

            {/* মেসেজ পাঠানোর বাটন */}
            <button 
                onClick={sendMessage} 
                disabled={!isConnected} 
                className={`mt-4 w-full px-4 py-2 text-white font-medium rounded-lg shadow-md transition-all duration-200 
                    ${isConnected 
                        ? 'bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-500 focus:ring-opacity-50' 
                        : 'bg-gray-400 cursor-not-allowed'
                    }`
                }
            >
                সার্ভারে মেসেজ পাঠান
            </button>
        </div>
    );
}