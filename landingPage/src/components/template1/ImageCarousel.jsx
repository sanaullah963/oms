"use client";
import { useState } from "react";
import Image from "next/image";


export default function ImageCarousel({
  images,
  alt,
  imageClassName = "",
  width = 650,
  height = 650,
}) {
  const [index, setIndex] = useState(0);
  const [brokenSrcs, setBrokenSrcs] = useState({});


  if (typeof window !== "undefined") {
    // console.log(`[ImageCarousel:${alt}] received ${images.length} image(s):`, images);
  }

  const activeSrc = images[index];

  const openFullImage = () => {
    window.open(activeSrc, "_blank", "noopener,noreferrer");
  };

  const markBroken = (src) => {
    console.error(`[ImageCarousel] failed to load: ${src} — check that this exact file exists under /public`,
    );
    setBrokenSrcs((prev) => ({ ...prev, [src]: true }));
  };

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-start">
      {images.length > 1 && (
        <div className="flex shrink-0 gap-2 overflow-x-auto pr-16 sm:w-20 sm:flex-col sm:overflow-x-visible sm:pr-0 ">
          
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`ছবি ${i + 1} দেখুন`}
              className={`relative h-16 w-16 shrink-0  rounded-md  border-4 bg-white transition sm:h-20 sm:w-20 ${
                i === index
                  ? "border-green-500"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              {brokenSrcs[img] ? (
                <span className="flex h-full w-full items-center justify-center bg-gray-100 text-[10px] text-gray-400">
                  no image
                </span>
              ) : (
                <Image
                  key={img}
                  src={img}
                  alt={`${alt} - থাম্বনেইল ${i + 1}`}
                  fill
                  sizes="80px"
                  className="object-cover rounded"
                  onError={() => markBroken(img)}
                />
              )}
            </button>
          ))}
        </div>
      )}

      
     
      {/* Main image — click to open full size in a new tab */}
<button
  type="button"
  onClick={openFullImage}
  aria-label="বড় সাইজে ছবিটি দেখুন"
  className="relative flex min-w-0 flex-1 cursor-zoom-in items-center justify-center"
>
  {brokenSrcs[activeSrc] ? (
    <div
      className={`mx-auto flex items-center justify-center bg-gray-100 text-sm text-gray-400 ${imageClassName}`}
      style={{ width, height: height / 2 }}
    >
      ছবি লোড হয়নি: {activeSrc}
    </div>
  ) : (
    <Image
      key={activeSrc}
      src={activeSrc}
      alt={alt}
      width={width}
      height={height}
      sizes="(min-width: 1024px) 50vw, 100vw"
      className={`mx-auto h-auto max-h-[80vh] w-auto max-w-full object-contain ${imageClassName}`}
      priority
      onError={() => markBroken(activeSrc)}
    />
  )}
</button>
    </div>
  );
}
