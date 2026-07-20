const LoadingSpinner = () => {
  return (
    <div className="flex items-center justify-center space-x-1 min-h-[1.25rem]">
      <div
        className="w-2 h-2 bg-fuchsia-400 rounded-full animate-pulse"
        style={{ animationDelay: "0s" }}
      ></div>
      <div
        className="w-2 h-2 bg-fuchsia-400 rounded-full animate-pulse"
        style={{ animationDelay: "0.2s" }}
      ></div>
      <div
        className="w-2 h-2 bg-fuchsia-400 rounded-full animate-pulse"
        style={{ animationDelay: "0.4s" }}
      ></div>
    </div>
  );
};

export default LoadingSpinner;
