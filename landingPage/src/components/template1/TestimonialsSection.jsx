"use client";
import { MdSend } from "react-icons/md";
import Container from "../common-ui/Container";
import { useState } from "react";

export default function TestimonialsSection({ page }) {
  const testimonials = page?.testimonials?.length ? page.testimonials : [];

  const [formData, setFormData] = useState({
    name: "",
    number: "",
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
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-green-50 py-16">
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
          {testimonials.map((r, i) => (
            <div
              key={i}
              className=" snap-center rounded-xl border border-gray-400 bg-white px-4 py-2 shadow-xl"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-600 text-lg font-bold text-white">
                  {r.name?.[0] || "?"}
                </div>
                <div>
                  <div className="flex gap-3">
                    <h3 className="text-lg font-bold">{r.name}</h3>
                    <div className="text-lg text-yellow-500">
                      {"★".repeat(r.rating || 5)}
                      {"☆".repeat(5 - (r.rating || 5))}
                    </div>
                  </div>
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-600">{r.text}</p>
            </div>
          ))}

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
              {/* number */}
              <input
                type="tel"
                placeholder="Number"
                name="number"
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
      </Container>
    </section>
  );
}
