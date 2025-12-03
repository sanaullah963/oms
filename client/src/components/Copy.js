// components/CopyToast.jsx
export default function Copy({ show }) {
  return (
    <div
      className={`fixed bottom-5 left-1/2 -translate-x-1/2 
      px-4 py-2 text-sm rounded-lg shadow-md bg-black text-white
      transition-all duration-300
      ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
      `}
    >
      📋 Copied!
    </div>
  );
}
