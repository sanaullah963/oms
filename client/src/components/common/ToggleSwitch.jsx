import React, { useState, useEffect } from "react";

const ToggleSwitch = ({ storageKey, onValue, offText, onText }) => {
  // ✅ ফিক্স: localStorage সরাসরি useState initializer-এ অ্যাক্সেস করলে Next.js-এর
  // server-side render-এ ক্র্যাশ করার ঝুঁকি থাকে (localStorage সার্ভারে নেই)।
  // তাই শুরুতে false দিয়ে শুরু করে useEffect-এ client-side-এ মান লোড করা হচ্ছে।
  const [isOn, setIsOn] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (saved === "true") setIsOn(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, isOn);
    if (onValue) {
      onValue(isOn);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOn, storageKey]);

  return (
    <div className="flex items-center justify-between w-full max-w-sm p-4 border border-gray-200 rounded-2xl bg-white shadow-sm">
      <span className="text-gray-700 font-medium transition-all duration-300">
        {isOn ? onText : offText}
      </span>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={isOn}
          onChange={() => setIsOn(!isOn)}
        />
        <div
          className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer
          peer-checked:after:translate-x-full peer-checked:after:border-white
          after:content-[''] after:absolute after:top-[2px] after:left-[2px]
          after:bg-white after:border-gray-300 after:border after:rounded-full
          after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"
        ></div>
      </label>
    </div>
  );
};

export default ToggleSwitch;
