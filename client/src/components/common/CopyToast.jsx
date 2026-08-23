"use client";

import { useEffect, useState } from "react";
import { registerToast } from "@/lib/toast";

const POSITION_CLASSES = {
  bottom: "bottom-24",
  top: "top-24",
};

export default function CopyToast() {
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState("");
  const [position, setPosition] = useState("bottom");

  useEffect(() => {
    registerToast((msg, pos = "bottom") => {
      setMessage(msg);
      setPosition(pos === "top" ? "top" : "bottom");
      setShow(true);

      setTimeout(() => {
        setShow(false);
      }, 1000);
    });
  }, []);

  return (
    <div

      className={`fixed ${POSITION_CLASSES[position]} left-1/2 z-[99999] -translate-x-1/2 transition-opacity duration-300 ${show ? "opacity-100" : "opacity-0 pointer-events-none"}`}
    >
      <div className="rounded-md bg-black/85 px-5 py-2 text-sm text-white shadow-xl">
        {message}
      </div>
    </div>
  );
}
