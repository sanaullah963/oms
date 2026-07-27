"use client";

import { useEffect, useState } from "react";
import { registerToast } from "@/lib/toast";

export default function CopyToast() {
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    registerToast((msg) => {
      setMessage(msg);
      setShow(true);

      setTimeout(() => {
        setShow(false);
      }, 1000);
    });
  }, []);

  return (
    <div
      // className={`fixed bottom-8 left-1/2 z-[99999]
      // -translate-x-1/2 transition-all duration-300
      // ${
      //   show
      //     ? "opacity-100 translate-y-0"
      //     : "opacity-0 translate-y-3 pointer-events-none"
      // }`}
      className={`fixed bottom-24 left-1/2 z-[99999]
  -translate-x-1/2 transition-opacity duration-300
  ${show ? "opacity-100" : "opacity-0 pointer-events-none"}`}
    >
      <div className="rounded-md bg-black/85 px-2 py-2 text-sm text-white shadow-xl">
        {message}
      </div>
    </div>
  );
}
