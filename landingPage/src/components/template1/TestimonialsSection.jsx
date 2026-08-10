"use client";
import { MdSend } from "react-icons/md";
import Container from "../common-ui/Container";
import { useState } from "react";

const reviews = [
  {
    initial: "R",
    name: "রাকিব",
    date: "15/3/2025",
    text: "নিয়মিত ব্যবহারের ফলে আমার খাওয়ার রুচিতে ইতিবাচক পরিবর্তন লক্ষ্য করেছি।",
  },
  {
    initial: "R",
    name: "রাকিব",
    date: "15/3/2025",
    text: "নিয়মিত ব্যবহারের ফলে আমার খাওয়ার রুচিতে ইতিবাচক পরিবর্তন লক্ষ্য করেছি।",
  },
];

export default function TestimonialsSection() {
  const [formData, setFormData] = useState({
    name: "",
    rating: "",
    comment: "",
  });
const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };
  const handelCommentSubmit = (e) => {
    e.preventDefault();
    console.log("Comment Data:", formData);
    // if we want to clear the form
    // setFormData({
    //   name: "",
    //   rating: "",
    //   comment: "",
    // });
  };
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-green-50 py-16">
      {/* <div className="absolute -top-20 left-0 h-80 w-80 rounded-full bg-green-200/30 blur-[120px]" /> */}
      {/* <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-red-200/30 blur-[120px]" /> */}
      <Container>
        {/* Heading */}
        <div className="mx-auto max-w-3xl text-center">
          <span className="rounded-full bg-yellow-100 px-4 py-1.5 text-sm font-bold text-yellow-700">
            ⭐ Customer Experience
          </span>

          <h2 className="mt-5 text-3xl font-extrabold text-gray-900 md:text-5xl">
            গ্রাহকদের
            <span className="text-green-600"> অভিজ্ঞতা</span>
          </h2>

          <p className="mt-5 text-base leading-7 text-gray-600">
            অনেক গ্রাহক তাঁদের ব্যবহার অভিজ্ঞতা আমাদের সঙ্গে শেয়ার করেছেন।
          </p>
        </div>

        {/* Review Slider */}
        <div className="mt-10 snap-x snap-mandatory grid gap-2 grid-cols-1 md:grid-cols-2">
          {reviews.map((r, i) => (
            <div
              key={i}
              className=" snap-center rounded-xl border border-gray-400 bg-white px-4 py-2 shadow-xl"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-600 text-lg font-bold text-white">
                  {r.initial}
                </div>
                <div>
                  <div className="flex gap-3">
                    <h3 className="text-lg font-bold">{r.name}</h3>
                    <div className="text-lg text-yellow-500">★★★★★</div>
                  </div>
                  <p className="text-sm text-gray-500">{r.date}</p>
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-600">{r.text}</p>
            </div>
          ))}

          {/* <div className=" snap-center rounded-xl border border-gray-400 bg-white px-4 py-2 shadow-xl">
            <form className="flex w-full justify-between rounded-3xl">
              <input
                type="text"
                placeholder="+ add your comment"
                className="flex-1 border-b-2 border-b-gray-500"
              />
              <button
                type="submit"
                className="rounded-full bg-blue-500 p-2 text-white"
              >
                <MdSend />
              </button>
            </form>
          </div> */}

          <div className="rounded-xl border border-gray-300 bg-white p-2 shadow-xl">
            <h2 className="text-lg font-bold text-gray-800">আপনার মন্তব্য</h2>
            <form
              className="flex flex-col gap-3  md:items-center"
              onSubmit={handelCommentSubmit}
            >
              {/* Name */}
              <input
                type="text"
                placeholder="Your Name"
                name="name"
                onChange={handleChange}
                className="rounded-lg border border-gray-300 px-3 py-2 outline-none w-full focus:border-blue-500 md:w-52"
                required
              />

              {/* Rating */}
              <select
                className="rounded-lg border border-gray-300 px-3 py-2 outline-none w-full focus:border-blue-500 md:w-36"
                required
                defaultValue=""
                onChange={handleChange}
                name="rating"
              >
                <option value="" disabled>
                  Rating
                </option>
                <option value="1">1 ★</option>
                <option value="2">2 ★★</option>
                <option value="3">3 ★★★</option>
                <option value="4">4 ★★★★</option>
                <option value="5">5 ★★★★★</option>
              </select>

              {/* Comment */}
              <input
                type="text"
                name="comment"
                onChange={handleChange}
                placeholder="Write your comment..."
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                required
              />

              {/* Submit */}
              <button
                type="submit"
                className="flex h-11 w-11 items-center justify-center rounded-lg mx-auto w-full bg-blue-500 text-white transition px-3 hover:bg-blue-600"
              >
                <MdSend size={20} />
              </button>
            </form>
          </div>
        </div>

        {/* Trust Features */}
        {/* <div className="mt-14 grid gap-5 md:grid-cols-3">
          <div className="rounded-3xl bg-gradient-to-r from-green-600 to-red-500 p-6 text-white shadow-2xl">
            <h3 className="text-2xl font-extrabold">আজই অর্ডার করুন</h3>
            <p className="mt-4 leading-7 text-white/90">
              স্বাস্থ্যকর জীবনযাত্রার অংশ হিসেবে আনার দানা যুক্ত করুন।
            </p>
            <a
              href="#order"
              className="mt-6 inline-flex rounded-2xl bg-white px-6 py-3 text-sm font-bold text-green-700 transition hover:scale-105"
            >
              🛒 এখনই অর্ডার করুন
            </a>
          </div>
        </div> */}
      </Container>
    </section>
  );
}
