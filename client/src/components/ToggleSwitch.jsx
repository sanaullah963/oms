import React, { useState, useEffect } from "react";

const ToggleSwitch = ({
  storageKey,
  onValue,
  offText,
  onText,
}) => {
  // ১. LocalStorage থেকে আগের ভ্যালু চেক করা (ডিফল্ট 'false' বা Off)
  const [isOn, setIsOn] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved === "true" ? true : false;
  });

  // ২. যখনই isOn পরিবর্তন হবে, সেটা LocalStorage-এ সেভ হবে
  useEffect(() => {
    localStorage.setItem(storageKey, isOn);
    // যখনই ভ্যালু চেঞ্জ হবে, আমরা সেটা বাইরে পাঠিয়ে দেব
    if (onValue) {
      onValue(isOn);
    }
  }, [isOn, storageKey, onValue]);

  return (
    <div className="flex items-center justify-between w-full max-w-sm p-4 border border-gray-200 rounded-2xl bg-white shadow-sm">
      {/* বাম পাশের টেক্সট যা কন্ডিশন অনুযায়ী চেঞ্জ হবে */}
      <span className="text-gray-700 font-medium transition-all duration-300">
        {isOn ? onText : offText}
      </span>
      {/* মেইন সুইচ বাটন */}
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
