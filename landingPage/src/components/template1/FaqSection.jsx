"use client";
import { MdSend } from "react-icons/md";
import Container from "../common-ui/Container";
import { useState } from "react";

export default function FaqSection({ page }) {
  const faqs = page?.faqs?.length ? page.faqs : [];
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [formData, setFormData] = useState({
    phone: "",
    contactApp: "whatsapp",
    question: "",
  });

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Bangladesh Mobile Validation
    const phoneRegex = /^(?:\+8801|01)[3-9]\d{8}$/;
    if (!phoneRegex.test(formData.phone)) {
      alert("সঠিক মোবাইল নম্বর দিন");
      return;
    }
    if (formData.question.trim().length < 5) {
      alert("আপনার প্রশ্নটি লিখুন");
      return;
    }
    
    alert(formData.question);
    // Reset Form
    setFormData({
      phone: "",
      contactApp: "whatsapp",
      question: "",
    });
  };

  return (
    <section className="bg-white py-8">
      <Container>
        <div className="text-center">
          <span className="rounded-full bg-green-100 px-4 py-1.5 text-sm font-bold text-green-700">
            FAQ
          </span>
          <h2 className="mt-4 text-4xl font-extrabold">প্রশ্ন ও উত্তর</h2>
        </div>

        <div className="mt-10 space-y-2">
          {faqs.map((f, i) => (
            <details key={i} className="rounded-lg border p-2 shadow">
              <summary className="cursor-pointer text-lg font-bold ">
                {f.question}
              </summary>
              <p className="mt-2 leading-7 text-gray-600">{f.answer}</p>
            </details>
          ))}

          {/* <form className="flex w-full justify-between rounded-lg border p-5 shadow">
            <input
              type="text"
              placeholder="+ add your question"
              className="flex-1 border-b-2 border-b-gray-500"
            />
            <button type="submit" className="rounded-full bg-blue-500 p-2 text-white">
              <MdSend />
            </button>
          </form> */}

          <div className="rounded-xl border bg-white shadow-md">
            {/* Toggle Button */}
            <button
              type="button"
              onClick={() => setShowQuestionForm(!showQuestionForm)}
              className="flex w-full items-center justify-between rounded-xl px-5 py-4 text-left font-medium transition hover:bg-gray-50"
            >
              <span>❓ আমার প্রশ্ন আছে</span>

              <span
                className={`text-xl transition-transform duration-300 ${
                  showQuestionForm ? "rotate-180" : ""
                }`}
              >
                ▼
              </span>
            </button>

            {/* Collapsible Form */}
            <div
              className={`overflow-hidden transition-all duration-300 ${
                showQuestionForm ? "max-h-[500px] p-5 pt-0" : "max-h-0"
              }`}
            >
              <form onSubmit={handleSubmit} className="space-y-2">
                <input
                  type="tel"
                  name="phone"
                  placeholder="imo অথবা WhatsApp নাম্বার"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3"
                />

                <select
                  name="contactApp"
                  value={formData.contactApp}
                  onChange={handleChange}
                  className="w-full rounded-lg border  border-gray-300 px-4 py-3"
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="imo">IMO</option>
                </select>

                <textarea
                  rows={4}
                  name="question"
                  placeholder="আপনার প্রশ্ন লিখুন..."
                  value={formData.question}
                  onChange={handleChange}
                  className="w-full rounded-lg border  border-gray-300 px-4 py-3"
                />

                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-white hover:bg-blue-700"
                >
                  <MdSend />
                  প্রশ্ন পাঠান
                </button>
              </form>
            </div>
          </div>
        </div>
      </Container>
      {/* <div className="mx-auto max-w-5xl px-4">
        
      </div> */}
    </section>
  );
}
