import React from "react";

function ShowMessage({ message, type = "success" }) {
  return (
    <div
      className={`mt-2 mb-2 p-2 rounded-lg text-sm font-medium transition duration-300 shadow-md ${
        type === "success"
          ? "bg-green-100 border-l-4 border-green-500 text-green-700"
          : "bg-red-100 border-l-4 border-red-500 text-red-700"
      }`}
    >
      {message}
    </div>
  );
}

export default ShowMessage;
