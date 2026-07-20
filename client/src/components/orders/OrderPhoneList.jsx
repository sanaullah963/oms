import React from "react";

function OrderPhoneList({ castomerPhone, onCopy }) {
  const phones = Array.isArray(castomerPhone)
    ? castomerPhone
    : (castomerPhone || "").split(", ");

  return (
    <div className="flex items-center gap-1">
      {phones.map((phone, index) => (
        <p
          key={index}
          className="text-sm font-medium text-blue-600 hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            onCopy(phone);
          }}
        >
          {index > 0 && " |"} {phone}
        </p>
      ))}
    </div>
  );
}

export default OrderPhoneList;
