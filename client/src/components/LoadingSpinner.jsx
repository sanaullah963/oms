 const LoadingSpinner = () => {
 return (
    // Minimal container for just the spinner - removed p-4 padding for flexible embedding
   <div className="flex items-center justify-center space-x-1 min-h-[1.25rem]">
      
      {/* ডট ১: প্রথম স্পন্দন শুরু করবে */}
      <div 
        className="w-2 h-2 bg-fuchsia-400 rounded-full animate-pulse" 
        style={{ animationDelay: '0s' }}
      ></div>
      
      {/* ডট ২: ০.২ সেকেন্ড পরে স্পন্দন শুরু করবে */}
      <div 
        className="w-2 h-2 bg-fuchsia-400 rounded-full animate-pulse" 
        style={{ animationDelay: '0.2s' }}
      ></div>
      
      {/* ডট ৩: ০.৪ সেকেন্ড পরে স্পন্দন শুরু করবে */}
      <div 
        className="w-2 h-2 bg-fuchsia-400 rounded-full animate-pulse" 
        style={{ animationDelay: '0.4s' }}
      ></div>
    </div>
  );
};

export default LoadingSpinner;