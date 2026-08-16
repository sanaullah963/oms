# প্রজেক্ট সামারি — OMS (oms-main) + Anardana Landing (lanidgUi)

*পুরো কোডবেস (client + server + lanidgUi, তিনটা প্রজেক্ট) শুরু থেকে শেষ পর্যন্ত পড়ে তৈরি করা হয়েছে, এবং তারপর একাধিক আপডেটে (ফ্রড ডিটেকশন সিস্টেম, সেশন অ্যানালিটিক্স ড্যাশবোর্ড, Meta CAPI/Pixel ফিক্স, কয়েকটা বাগ ফিক্স) সবসময় সিঙ্ক রাখা হয়েছে। সর্বশেষ আপডেট §৯–§১১-এ।*

---

## ১. বড় ছবি (Big Picture)

দুটো আলাদা রিপো, একসাথে একটা সিস্টেম তৈরি করে:

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│  anardanaLanding-main        │        │   oms-main                    │
│  (Next.js, পাবলিক ল্যান্ডিং    │──HTTP──▶│   ├─ server (Express + Mongo)  │
│   পেজ, কাস্টমার-facing)       │  POST   │   │   → OMS-এর ব্রেইন, সব লজিক   │
│                               │  order  │   └─ client (Next.js, অ্যাডমিন │
│                               │        │       /মডারেটর ড্যাশবোর্ড)      │
└─────────────────────────────┘        └──────────────────────────────┘
```

- **oms-main/server** — আসল ব্যাকএন্ড। অথ, অর্ডার, কুরিয়ার (Steadfast), ফেসবুক কমেন্ট, ল্যান্ডিং পেজ CRUD, ড্যাশবোর্ড অ্যানালিটিক্স — সব এখানে।
- **oms-main/client** — অ্যাডমিন/মডারেটরদের জন্য Next.js ড্যাশবোর্ড (লগইন-প্রোটেক্টেড), যেখান থেকে অর্ডার ম্যানেজ, ল্যান্ডিং পেজ কনফিগার, ফেসবুক কমেন্ট মডারেট করা হয়।
- **anardanaLanding-main** — কাস্টমারদের দেখা পাবলিক ল্যান্ডিং পেজ। এখান থেকে অর্ডার সাবমিট হলে সরাসরি `oms-main/server`-এর পাবলিক API-তে (`/api/public/landing-pages/:slug/order`) POST হয় এবং `Order` ডকুমেন্ট তৈরি হয়, যেটা তখন OMS ড্যাশবোর্ডে ভেসে ওঠে (Socket.IO দিয়ে রিয়েল-টাইম)।

---

## ২. oms-main/server — ব্যাকএন্ড

**Stack:** Express 5, Mongoose 8, Socket.IO 4, JWT (jsonwebtoken), bcryptjs, node-cron, web-push, axios।

### ২.১ এন্ট্রি পয়েন্ট ও কনফিগ
- `index.js` — HTTP সার্ভার তৈরি করে, Socket.IO অ্যাটাচ করে (JWT দিয়ে সকেট অথও করা হয়, প্রতিটা ইউজারকে `user:<id>` রুমে এবং role অনুযায়ী `role:admin`/`role:moderator` রুমে জয়েন করানো হয়), MongoDB কানেক্ট করে, cron job চালু করে।
- `app.js` — সব রুট মাউন্ট করে। পাবলিক রুট (`/api/auth`, `/api/webhook`, `/api/push`, `/api/public/landing-pages`) বনাম প্রোটেক্টেড রুট (`/api/orders`, `/api/dashboard`) বনাম শুধু-অ্যাডমিন রুট (`/api/users`, `/api/facebook-pages`, `/api/landing-pages`) স্পষ্টভাবে আলাদা করা আছে।
- `config/env.js` — সব env var এক জায়গায়। `MONGODB_URI`/`JWT_SECRET` না থাকলে ক্রিটিকাল এরর লগ হয়। উল্লেখযোগ্য: একটা কমেন্টে বলা আছে আগে `FB_VERIFY_TOKEN`-এর একটা hardcoded fallback secret ছিল, যেটা এখন সরানো হয়েছে (security fix)।

### ২.২ মডেল (Mongoose Schemas)
| Model | মূল উদ্দেশ্য |
|---|---|
| `User` | name, phone (unique, login), passwordHash, role (`admin`/`moderator`), `isApproved` (সাইনআপ করলেই অ্যাক্টিভ হয় না, admin approve করতে হয়), pushSubscriptions (web-push এর জন্য) |
| `Order` | মূল অর্ডার ডকুমেন্ট — customer info, `productCode`, `totalCOD`, `orderStatus` enum (Pending/confirmed/released/Delivered/Cancelled/Booked/Scheduled), `activities[]` (টাইমলাইন), `courier{}` (Steadfast ট্র্যাকিং/status/আর্থিক তথ্য), `createdBy`/`createdByName` (কোন মডারেটর তৈরি করেছে) |
| `LandingPage` | slug, productName, productCode, price, images, testimonials, faqs, delivery charge info — ড্যাশবোর্ড থেকে অ্যাডমিন এখান থেকেই ল্যান্ডিং পেজ কনফিগার করে |
| `FacebookPage` | pageId, pageName, pageAccessToken, isActive — একাধিক FB পেজ সাপোর্ট করার জন্য |
| `FacebookComment` | pageId/postId/commentId/parentId, sender info, message, status (active/deleted/hidden), isReplied, isUserBlocked + কিছু ডিবাগ ফিল্ড (`debugRawEntryId` ইত্যাদি) |

> **লক্ষণীয়:** `models/Order.js`-এর উপরের প্রায় ৯০ লাইন একটা কমেন্ট-আউট করা পুরনো ভার্সন (ঠিক নিচের অ্যাক্টিভ ভার্সনের সাথে প্রায় হুবহু, শুধু `createdBy`/`createdByName` ফিল্ড নেই) — এটা ডেড কোড, চাইলে সরিয়ে ফেলা যায়।

### ২.৩ Controllers (মূল বিজনেস লজিক)

**`authController.js`** — signup/login/me। প্রথম যে ইউজার সাইনআপ করে সে অটোমেটিক admin + approved হয়ে যায়; পরবর্তী সবাই moderator + pending approval।

**`orderController.js`** (376 লাইন, সবচেয়ে গুরুত্বপূর্ণ) —
- `getOrders` — মডারেটর শুধু নিজের তৈরি অর্ডার + "মালিকহীন" (createdBy null, যেমন ল্যান্ডিং পেজ থেকে আসা) অর্ডার দেখে; অ্যাডমিন সব দেখে। Aggregation দিয়ে Cancelled/Booked স্ট্যাটাসের অর্ডার শুধু গত ২ দিনের দেখানো হয় (পুরনোগুলো ফিল্টার আউট), বাকি সব স্ট্যাটাস সবসময় দেখা যায়।
- `extractOrdersFromRawText` — WhatsApp/Messenger থেকে কপি-পেস্ট করা raw টেক্সট থেকে একাধিক অর্ডার আলাদা করে, নাম/ফোন `parser.js` দিয়ে বের করে (bulk paste সাপোর্ট করে)।
- `attachCourierHistory` — একই ফোন নম্বরে আগে কতগুলো অর্ডার হয়েছে তা অ্যাগ্রিগেট করে `courierHistory.our`-এ বসায় (রিপিট কাস্টমার/রিস্কি কাস্টমার বোঝার জন্য কাজে লাগে)।
- `createManualOrder`, `deleteOrder`, `updateOrder`, `updateNeedAttention`, `scheduleOrder`, `steadfastBookingWebhook` — CRUD + সিডিউলিং + বুকিং-টাইম ওয়েবহুক।
- প্রতিটা মিউটেশনে Socket.IO দিয়ে (`emitOrderUpdate`) সংশ্লিষ্ট ইউজারদের রিয়েল-টাইম push হয়, এবং নতুন অর্ডার এলে `sendNotificationToApprovedUsers` দিয়ে Web Push নোটিফিকেশনও যায়।

**`webhookController.js`** — Steadfast-এর `delivery_status` ওয়েবহুক হ্যান্ডল করে। Bearer token দিয়ে ভ্যারিফাই করে, `tracking_message` কে ignore-প্যাটার্নের বিপরীতে ম্যাচ করে "গুরুত্বপূর্ণ কিনা" (`needsAttention`) ঠিক করে, এবং Delivered/Cancelled হলে COD amount, delivery charge, ১% COD চার্জ (`utils/codCharge.js`) হিসাব করে সেভ করে — এটাই ফাইন্যান্সিয়াল ড্যাশবোর্ডের ডেটা সোর্স।

**`steadfastController.js`** — অর্ডার বুক করার জন্য Steadfast API কল করে (single); `steadfastBulkController.js` — বাল্ক বুকিং ভার্সন।

**`dashboardController.js`** — তারিখ-রেঞ্জ ভিত্তিক অ্যানালিটিক্স: sent/delivered/cancelled কাউন্ট, delivered amount, delivery charge, COD charge, net deduction, দৈনিক ট্রেন্ড (চার্টের জন্য), COD mismatch ডিটেকশন (courier-এর cod_amount vs আমাদের totalCOD না মিললে ফ্ল্যাগ করে)। মডারেটর শুধু নিজের স্কোপ দেখে, অ্যাডমিন `?moderatorId=` দিয়ে নির্দিষ্ট মডারেটর ফিল্টার করতে পারে বা সব দেখতে পারে।

**`landingPageController.js`** (admin-only CRUD) + **`publicLandingController.js`** (পাবলিক) — এই দুটোই anardanaLanding প্রজেক্টের সাথে সংযোগস্থল:
- `GET /api/public/landing-pages/:slug` — কাস্টমার-facing পেজের কনফিগ রিটার্ন করে।
- `POST /api/public/landing-pages/:slug/order` — কাস্টমার অর্ডার সাবমিট করলে এখানে হিট হয়। Honeypot ফিল্ড দিয়ে বট প্রোটেকশন আছে, ফোন নম্বর regex ভ্যালিডেশন (`^01\d{9}$`) আছে। অর্ডার তৈরি হয় `createdBy: null` দিয়ে (কোনো নির্দিষ্ট মডারেটরের না, শেয়ার্ড পেন্ডিং কিউতে যায়), তারপর Socket emit + push notification পাঠানো হয়।

**`facebookController.js` / `facebookPageController.js`** — মেটা গ্রাফ API ইন্টিগ্রেশন। একাধিক FB পেজ সাপোর্ট করে; webhook থেকে কমেন্ট আসলে `post_id`-এর প্রিফিক্স থেকে আসল pageId বের করা হয় (entry.id-এর চেয়ে বেশি নির্ভরযোগ্য, কারণ একাধিক পেজ একই App-এর আন্ডারে থাকলে entry.id ভুল/একই আসতে পারে) — কোডে এটা নিয়ে ভালো ডায়াগনস্টিক লগিং আছে। reply/delete/block/delete-and-block/hard-delete — সবগুলো অ্যাকশন সাপোর্ট করে, এবং টোকেন এক্সপায়ার হলে (`code: 3, 190, 200`) স্পষ্ট এরর মেসেজ দেয়।
> এই ফাইলে পুরনো ভার্সন কমেন্ট-আউট করে উপরে রাখা আছে (ডেড কোড, প্রায় হুবহু নতুন ভার্সনের মতোই, শুধু ডিবাগ লগিং কম ছিল)।

**`pushController.js`, `userController.js`** — ছোট, সরল CRUD/ইউটিলিটি কন্ট্রোলার।

### ২.৪ Middleware, Utils, Jobs
- `middleware/auth.js` — `protect` (JWT ভ্যারিফাই + approved চেক) এবং `adminOnly`।
- `utils/parser.js` — বাংলা+ইংরেজি ফোন নম্বর ডিটেকশন (Bangla digit normalize করে), "নাম:" প্যাটার্ন বা প্রথম লাইন থেকে নাম বের করা।
- `utils/codCharge.js` — (deliveredCod - deliveryCharge) এর ১%, ceil করে।
- `utils/socketBroadcast.js` — `emitOrderUpdate`: admin room সবসময় পায়; createdBy থাকলে সেই নির্দিষ্ট ইউজার পায়; createdBy না থাকলে (ল্যান্ডিং পেজ/অজানা সোর্স) সব মডারেটর পায়।
- `jobs/scheduledOrderReleaser.js` — প্রতিদিন cron (`0 0 * * *`, UTC) দিয়ে `Scheduled` অর্ডারগুলো `Pending`-এ রিলিজ করে।

  > ✅ **ফিক্সড (আপডেট দেখুন §৭.১):** আগে এই ফাইলে ফিল্টার করা হতো `releaseDate: { $lte: today }` দিয়ে, কিন্তু `Order` মডেলে আসলে ফিল্ড আছে `scheduledDate`। এখন `releaseDate` কে `scheduledDate` করে ঠিক করা হয়েছে।

- `controllers/orderController copy.js`, `controllers/steadfastController copy.js`, `utils/facebookPages copy.js` — এগুলো ব্যাকআপ/ওয়ার্কিং কপি ফাইল, রুটে ব্যবহৃত হয় না (dead files, cleanup করা যায়)।

---

## ৩. oms-main/client — অ্যাডমিন/মডারেটর ড্যাশবোর্ড

**Stack:** Next.js (App Router), Context API (Zustand/TanStack Query না — এই প্রজেক্টে state management হালকা, Context দিয়েই করা), socket.io-client, recharts, react-toastify।

### ৩.১ স্ট্রাকচার
- **Auth:** `context/AuthContext.jsx` — লগইন/সাইনআপ/লগআউট, token localStorage-এ (`oms_auth_token`), লগইন হলে সকেট কানেক্ট করে (`connectSocketWithAuth`)। `components/auth/AuthGuard.jsx` দিয়ে প্রোটেক্টেড পেজ র‍্যাপ করা।
- **Orders:** `context/OrderContext.jsx` — সব অর্ডার fetch করে, Socket.IO দিয়ে রিয়েল-টাইম আপডেট মার্জ করে (`handleOrderUpdate`), এবং সোশ্যাল সার্চের জন্য সকেট-বেজড ডেবাউন্সড সার্চ (`searchQuery` ইমিট করে, `searchResult` লিসেন করে) আছে।
- **`services/`** — প্রতিটা ডোমেইনের জন্য আলাদা axios wrapper (`authService`, `orderService`, `dashboardService`, `facebookService`, `facebookPageService`, `landingPageService`, `userService`, `pushService`)। `services/api.js`-এ centralized axios instance, request interceptor দিয়ে token attach, response interceptor দিয়ে 401 হলে auto-logout + redirect।

### ৩.২ পেজ ও প্রধান ফিচার
| পেজ | কাজ |
|---|---|
| `app/page.js`, `app/dashboard/page.js` | মূল অর্ডার লিস্ট/ম্যানেজমেন্ট ড্যাশবোর্ড — StatsCards, TrendChart, StatusPieChart, MismatchTable, DateRangeFilter, ModeratorSelector (অ্যাডমিনের জন্য) |
| `app/login`, `app/signup` | অথ পেজ |
| `app/dashboard/users` | UserManagementTable — অ্যাডমিন ইউজার approve/role সেট করে |
| `app/dashboard/landing-pages` | LandingPageManager + LandingPageForm — ল্যান্ডিং পেজ CRUD (slug, price, images, testimonials, FAQ ইত্যাদি) |
| `app/dashboard/facebook-pages` | FacebookPageManager — কোন কোন FB পেজ কানেক্টেড, টোকেন সেট/মাস্কড দেখানো |
| `app/comment`, `app/note` | সম্ভবত কমেন্ট মডারেশন / নোট-সম্পর্কিত আলাদা ভিউ (মূল কমেন্ট UI হলো `FacebookLiveComments.jsx`, ৫৯৬ লাইন — সবচেয়ে বড় কম্পোনেন্ট, রিয়েল-টাইম কমেন্ট স্ট্রিম + reply/delete/block অ্যাকশন) |
| `app/dashboard/event-logs` | `EventLogViewer.jsx` — Meta CAPI-তে পাঠানো ইভেন্টগুলোর (Lead/Purchase ইত্যাদি) লগ দেখা ও ব্যর্থ (`failed`) ইভেন্ট রিট্রাই করা (দেখুন §৮.৩) |
| মূল অর্ডার লিস্টের "Incomplete" ট্যাব | `app/page.js`-এ `activeStatus === "Incomplete"` হলে `DraftOrderList` রেন্ডার হয় (দেখুন §৮.১) |

### ৩.৩ অর্ডার-সংক্রান্ত কম্পোনেন্ট (largest cluster)
`OrderCard.jsx` (404 লাইন) — প্রতিটা অর্ডারের কার্ড UI, স্ট্যাটাস বদলানো, কুরিয়ার বুক করা ইত্যাদি হাব। এর সাথে `OrderActions`, `OrderEditForm`, `OrderActivityTimeline` (টাইমলাইন দেখায়), `NoteBubble`, `ScheduleModal`, `ManualOrderInput` (raw টেক্সট পেস্ট করে বাল্ক অর্ডার তৈরি করার UI), `OrderPhoneList`, `OrderList`। `hooks/useOrderActions.js` এ এইসব অ্যাকশনের (status change, delete, courier booking) লজিক সেন্ট্রালাইজড।

`hooks/useSocket.js` — সকেট কানেকশন লাইফসাইকেল ম্যানেজ করে (auth টোকেন দিয়ে কানেক্ট, ইভেন্ট লিসেন)।

---

## ৪. anardanaLanding-main — পাবলিক ল্যান্ডিং পেজ প্রজেক্ট

**Stack:** Next.js (App Router), Tailwind CSS v4, axios, react-icons। *(হালকা প্রজেক্ট — কোনো ব্যাকএন্ড/DB নেই, শুধু OMS-এর পাবলিক API কল করে।)*

### ৪.১ রুট স্ট্রাকচার
- `app/page.js` — হোমপেজ, শুধু একটা মেসেজ দেখায় ("নির্দিষ্ট প্রোডাক্টের লিংক দিয়ে ভিজিট করুন") + `/templates`-এর লিংক।
- `app/templates/page.js` — টেমপ্লেট ব্রাউজ করার ইনডেক্স পেজ (এখন একটাই টেমপ্লেট লিস্টেড: `anardana-v2`)।
- `app/templates/anardanav2/page.js` — স্ট্যাটিক ডেমো পেজ, `TemplateOneBody` রেন্ডার করে (slug prop ছাড়াই)।
- `app/[slug]/page.js` — **ডায়নামিক স্লাগ রুট**, যেটা `TemplateOneBody`-কে `slug` পাস করে। এখানেই ভবিষ্যতে dynamic landing page রেন্ডারিং হওয়ার কথা।

### ৪.২ `TemplateOneBody.jsx` — মূল টেমপ্লেট কম্পোজিশন
সেকশনগুলো ক্রমানুসারে: `HeroTop → BenefitsSection → FaqSection → TrustSection → TestimonialsSection → UsageGuideSection → OfferSection → OrderSection → FloatingContactButton (WhatsApp/Call/IMO) → StickyMobileBar → Footer`।

পেজ লোড হওয়ার সাথে সাথে `captureAttributionOnLoad()` কল হয় (UTM/fbclid/gclid/referrer ধরে রাখার জন্য)।

### ৪.৩ **গুরুত্বপূর্ণ পর্যবেক্ষণ — ডায়নামিক রেন্ডারিং এখনো বাস্তবায়িত হয়নি**

ইউজারের বর্ণনার সাথে মিলিয়ে কোডে যা পাওয়া গেছে:

1. **`services/landingService.js`** সম্পূর্ণ প্রস্তুত আছে (`getBySlug`, `submitOrder` with tracking payload, এবং `fetchLandingPageServerSide` সার্ভার-কম্পোনেন্টে ব্যবহারের জন্য) — কিন্তু **কোনো কম্পোনেন্টই এটা import/ব্যবহার করছে না**। `HeroTop`, `BenefitsSection`, `FaqSection` ইত্যাদি সব সেকশনে প্রোডাক্ট নাম, দাম, ছবি, টেস্টিমোনিয়াল — সব হার্ডকোডেড ("আনার দানা" প্রোডাক্টের জন্য নির্দিষ্ট), props হিসেবে কোনো ডেটা নেয় না।
2. **`OrderSection.jsx`**-এ `PRODUCT_PRICE = 890`, `PRODUCT_NAME`, `PRODUCT_IMAGE` — সব কনস্ট্যান্ট হিসেবে হার্ডকোড করা, `LandingPage` মডেল থেকে আসা ডেটার সাথে ডাইনামিকালি কানেক্টেড না।
3. অর্ডার সাবমিট করার সময় `OrderSection.jsx` নিজে থেকে raw `axios.post` কল করছে (`landingService.submitOrder` ব্যবহার না করে), ফলে **`utils/tracking.js`-এ তৈরি করা attribution/tracking payload (`fbp`, `fbc`, `sessionId`, UTM ইত্যাদি) আসলে অর্ডার সাবমিশনের সাথে সার্ভারে পাঠানো হচ্ছে না** — যদিও `getTrackingPayload()` ফাংশন সম্পূর্ণ কাজ করার মতো তৈরি করা আছে।
4. `productCode: "P-Landing01"` হার্ডকোড করা — এটাও OMS-এর `LandingPage.productCode`-এর সাথে ম্যাচ করাতে ডাইনামিক হওয়া দরকার (slug অনুযায়ী)।
5. `[slug]/page.js` স্লাগ রিসিভ করলেও শুধু `console.log` করছে, `fetchLandingPageServerSide(slug)` কল করে ডেটা fetch করে `TemplateOneBody`-তে prop হিসেবে পাস করছে না।

**সংক্ষেপে:** API-লেয়ার (backend + landingService.js) পুরোপুরি dynamic-ready, কিন্তু UI কম্পোনেন্টগুলো এখনো একটামাত্র হার্ডকোডেড প্রোডাক্টের (আনার দানা) জন্য বাঁধা। পরবর্তী ধাপ হবে প্রতিটা সেকশনকে props/context দিয়ে ডেটা-ড্রিভেন করা এবং `[slug]/page.js`-কে `fetchLandingPageServerSide` দিয়ে সংযুক্ত করা।

### ৪.৪ ছোট ইউটিলিটি
- `utils/tracking.js` — session ID জেনারেশন (localStorage), first-touch attribution capture, `_fbp`/`_fbc` কুকি রিড, `getTrackingPayload(slug)`।
- `components/common-ui/Container.jsx` — লেআউট wrapper।

---

## ৫. দুই প্রজেক্টের সংযোগ — একনজরে

| | anardanaLanding | oms-main/server |
|---|---|---|
| GET পেজ কনফিগ | `landingService.getBySlug(slug)` (তৈরি আছে, ব্যবহৃত না) | `GET /api/public/landing-pages/:slug` |
| অর্ডার সাবমিট | `OrderSection.jsx` (raw axios, হার্ডকোডেড productCode) | `POST /api/public/landing-pages/:slug/order` |
| ফলাফল | নতুন `Order` ডকুমেন্ট `createdBy: null` দিয়ে তৈরি | Socket.IO → OMS ড্যাশবোর্ডের মডারেটর/অ্যাডমিন রিয়েল-টাইমে দেখে, ওয়েব পুশ নোটিফিকেশন যায় |

---

## ৬. নতুন ফিচার — ইনকমপ্লিট অর্ডার, সেশন ট্র্যাকিং, Meta CAPI, কাস্টমার টাইমলাইন

*(এই সেকশনটা সবচেয়ে সাম্প্রতিক আপডেটে যোগ করা — আগের সামারিতে এগুলো ছিল না।)*

### ৬.১ ইনকমপ্লিট (Draft) অর্ডার সিস্টেম — abandoned cart রিকভারি

**উদ্দেশ্য:** কাস্টমার ল্যান্ডিং পেজের ফর্মে টাইপ করা শুরু করলে (এখনো সাবমিট করেনি) সেই আংশিক তথ্য মডারেটর/অ্যাডমিন দেখতে পারে — যাতে কল করে ম্যানুয়ালি ফলো-আপ করা যায়।

- **`server/models/DraftOrder.js`** — নতুন মডেল। ফিল্ড: `sessionId`, `landingPageSlug`, `name`/`phone`/`address`/`quantity` (আংশিক হতে পারে), `productName`, `status` (`active`/`completed`/`abandoned`), `completedOrder` (রেফারেন্স), এবং `tracking{}` (Order মডেলের মতোই — fbp/fbc/fbclid/gclid/UTM/ip/userAgent)। `createdAt`-এর উপর ৩০ দিনের TTL ইনডেক্স আছে (পুরনো draft অটো-ডিলিট)।
- **`lanidgUi/src/utils/tracking.js`-এ `saveDraftOrder(slug, formData)`** — ফর্মের যেকোনো ফিল্ড বদলালে ৮০০ms debounce করে `POST /api/public/tracking/draft`-এ পাঠায়। `OrderSection.jsx`-এ একটা `useEffect` দিয়ে কল করা হয় (name/phone/address/quantity বদলালেই)।
- **`server/controllers/publicTrackingController.js` → `saveDraftOrder`** — `{sessionId, landingPageSlug}` দিয়ে upsert করে (status `"completed"` না হলে)। নাম/ফোন/ঠিকানা তিনটাই খালি হলে সেভ করে না।
- কাস্টমার আসলেই সাবমিট করলে (**`publicLandingController.submitPublicOrder`**) আসল `Order` তৈরি হওয়ার পর একই `sessionId`+`slug`-এর draft-টা সরাসরি **ডিলিট** করে দেওয়া হয় (একটা `"completed"` স্ট্যাটাসে রেখে দেওয়া হয় না) — তাই ইনকমপ্লিট আর আসল অর্ডার কখনো দুই জায়গায় ডুপ্লিকেট থাকে না।
- **অ্যাডমিন সাইড:** `GET /api/orders/drafts` (`orderController.getDraftOrders`, শুধু `status: "active"`, সর্বশেষ ২০০টা) ও `DELETE /api/orders/drafts/:id` (ম্যানুয়ালি সম্পূর্ণ ডিলিট)। রিয়েল-টাইম আপডেটের জন্য `utils/socketBroadcast.js`-এ নতুন `emitDraftUpdate`/`emitDraftRemove` (admin + সব moderator রুমে পাঠানো হয়, যেহেতু কোনো draft "কারো নিজের" না)।
- **ক্লায়েন্ট:** `services/draftOrderService.js`, `components/orders/DraftOrderCard.jsx` (কল/কপি/ডিলিট অ্যাকশন সহ, স্ট্যাটাস বদলানোর কোনো অপশন নেই যেহেতু এটা আসল অর্ডার না), `DraftOrderList.jsx`। `context/OrderContext.jsx`-এ `draftOrders` স্টেট + `draftOrderUpdate`/`draftOrderRemove` সকেট লিসেনার। মূল ড্যাশবোর্ডে (`app/page.js`) একটা নতুন **"Incomplete"** ট্যাব যোগ হয়েছে যেটা `DraftOrderList` রেন্ডার করে।

### ৬.২ সেশন/এনগেজমেন্ট ট্র্যাকিং

- **`server/models/Session.js`** — প্রতিটা ল্যান্ডিং পেজ ভিজিটের জন্য একটা ডকুমেন্ট। `visitorId` (localStorage-এ persist, একই ব্রাউজারে বারবার ভিজিটেও অপরিবর্তিত — return visitor শনাক্তের জন্য) বনাম `sessionId` (sessionStorage, প্রতি ট্যাব/ভিজিটে নতুন)। মেট্রিক: `timeOnPageSeconds`, `maxScrollDepth`, `clickCount`, `focusCount`/`blurCount`, `visibilityChangeCount`, `isBounce` (১০ সেকেন্ডের কম + কোনো ক্লিক নেই + স্ক্রল ২৫%-এর কম হলে bounce ধরা হয়), `isReturnVisitor`।
- **`lanidgUi/src/utils/tracking.js` → `initEngagementTracking(slug)`** — scroll/click/focus/blur/visibilitychange/beforeunload ইভেন্ট লিসেন করে, প্রতি ১৫ সেকেন্ডে (heartbeat) এবং পেজ ছাড়ার সময় (`visibilitychange` hidden বা `beforeunload`) সার্ভারে পাঠায়। এক্সিট হওয়ার সময় `navigator.sendBeacon` ব্যবহার করা হয় (fetch-এর চেয়ে বেশি নির্ভরযোগ্য)। `TemplateOneBody.jsx`-এ `useEffect`-এর ভেতর কল হয়, cleanup রিটার্ন করে।
- **`publicTrackingController.updateSession`** — `POST /api/public/tracking/session`, upsert করে `Session` ডকুমেন্ট।
- ✅ **আপডেট (§১০ দেখুন):** এই ডেটা (bounce rate, scroll depth, return visitor ইত্যাদি) এখন `/dashboard/sessions` পেজে টেবিল + গ্রাফ আকারে অ্যাডমিনদের দেখানো হয় — নতুন `sessionController.js` (aggregation) দিয়ে সামারি ও দৈনিক ট্রেন্ড বের করা হয়, `recharts` দিয়ে চার্ট রেন্ডার হয়।

### ৬.৩ Meta Conversions API (CAPI) ইন্টিগ্রেশন

- **`server/utils/metaCapi.js`** — `sendCapiEvent({eventName, orderId, sessionId, userData, customData})`: ফোন/ইমেইল SHA-256 হ্যাশ করে (Meta-র নিয়ম মেনে, বাংলাদেশি নম্বরকে `880`-প্রিফিক্সড E.164-এ নিয়ে গিয়ে), Graph API-তে POST করে, প্রতিটা ইভেন্ট **`EventLog`** মডেলে সেভ থাকে (payload + Meta response + status: pending/sent/failed)। কখনো throw করে না, ব্যর্থ হলেও কলিং কোড না ভাঙার জন্য ডিজাইন করা।
- **`server/models/EventLog.js`** — `eventName` (Purchase/Lead/InitiateCheckout/ViewContent/PageView), unique `eventId` (dedup key, ভবিষ্যতে ব্রাউজার Pixel-এর সাথে মেলানোর জন্য), status, retryCount।
- **যা পাঠানো হয় (৩টা ইভেন্ট):**
  1. **`PageView`** — ব্রাউজার Pixel (`fbq('track', 'PageView')`), `lanidgUi/src/app/layout.js`-এ। ✅ **আপডেট:** আগে পেজ লোড হওয়ার সাথে সাথেই যেত, এখন `fbq('init', ...)` সাথে সাথে হলেও `PageView` ট্র্যাক করা হয় **~১ সেকেন্ড ডিলে দিয়ে** (`setTimeout`) — এতে দ্রুত বাউন্স করা ভিজিটর/বট এই ইভেন্টে কাউন্ট হয় না, ফলে এর উপর ভিত্তি করে বানানো Custom Audience-এর মান ভালো হয়।
  2. **`Lead`** — কাস্টমার ল্যান্ডিং পেজ থেকে অর্ডার সাবমিট করলে (`publicLandingController.submitPublicOrder`-এর শেষে), সার্ভার-সাইড CAPI দিয়ে।
  3. **`Purchase`** — ✅ **এখন Implement করা হয়েছে** (আগে শুধু TODO কমেন্ট ছিল)। অ্যাডমিন অর্ডার "Confirmed" করলে `orderSocket.js`-এর `triggerPurchaseEvent()` কল হয়, কিন্তু **শুধু `Order.origin === "landing_page"` হলেই** — ম্যানুয়ালি/পেস্ট করে বানানো অর্ডার Confirm করলে কখনো Purchase ইভেন্ট যায় না (কারণ সেগুলোর সাথে কোনো fbp/fbc/সেশন অ্যাট্রিবিউশন থাকে না)। এই গেটিং-এর জন্য `Order` মডেলে নতুন `origin` ফিল্ড (`"landing_page"` | `"manual"`, ডিফল্ট `"manual"`) যোগ করা হয়েছে এবং `publicLandingController.js`-এ ল্যান্ডিং পেজ অর্ডার তৈরির সময় এটা এক্সপ্লিসিটলি সেট করা হয়।
- ❌ **এখনো নেই:** `ViewContent` (প্রোডাক্ট পেজ দেখলে) এবং `InitiateCheckout` (অর্ডার ফর্মে টাইপ শুরু করলে) — এই দুইটা ইভেন্ট এখনো implement করা হয়নি।
- **`retryEvent(eventLogId)`** — আগের payload অপরিবর্তিত রেখে আবার পাঠানোর ফাংশন, ব্যবহৃত হয় `eventLogController`/`eventLogRoutes` থেকে, ক্লায়েন্টে `EventLogViewer.jsx` (dashboard/event-logs পেজ) থেকে অ্যাডমিন ম্যানুয়ালি রিট্রাই করতে পারে। ⚠️ এই পেজটা (`/dashboard/event-logs`) ব্যাকএন্ড+ফ্রন্টএন্ড সম্পূর্ণ তৈরি থাকলেও নেভিগেশন মেনুতে (`SearchAndMenu.jsx`) এখনো এর কোনো লিংক নেই — যোগ করার প্রস্তাব দেওয়া হয়েছিল, এখনো করা হয়নি (§৭ দেখুন)।

### ৬.৪ কাস্টমার টাইমলাইন / প্রোফাইল (Admin-only)

- **`GET /api/customers/timeline?phone=01XXXXXXXXX`** (`customerController.getCustomerTimeline`, `customerRoutes.js`, শুধু admin) — একটা ফোন নম্বরের বিপরীতে সব `Order` + সব `DraftOrder` একসাথে টেনে আনে, একটা `summary` (মোট অর্ডার, confirmed/delivered/cancelled/pending কাউন্ট, মোট খরচ, ভিন্ন ভিন্ন নাম/ঠিকানা কতগুলো ব্যবহার করেছে, draft কাউন্ট) এবং একটা একত্রিত, তারিখ অনুযায়ী সাজানো `timeline` (অর্ডার তৈরি + প্রতিটা অ্যাক্টিভিটি + draft) রিটার্ন করে।
- এটাই মূলত OMS-এর "একই কাস্টমার আগে কী করেছে" প্রশ্নের বর্তমান উত্তর — তবে এখনো ম্যানুয়াল লুকআপ (ফোন নম্বর দিয়ে সার্চ করতে হয়), অর্ডার লিস্টে অটোমেটিক badge/আলাদা করে দেখানো হয় না (দেখুন §৮ নিচে, ইউজারের পাঠানো ডিটেকশন-সিস্টেম স্পেকের সাথে তুলনা করুন)।

### ৬.৫ ল্যান্ডিং পেজ কানেকশন — বর্তমান অবস্থা (রিপো এখন `lanidgUi`)

আগের সামারির §৪.৩-এ যা লেখা ছিল তার অনেকটাই **এখনো একই রকম আছে**, শুধু draft/session ট্র্যাকিং যোগ হয়েছে:

1. `[slug]/page.js` এখন `slug`-কে `TemplateOneBody`-তে prop হিসেবে পাস করে (আগে শুধু `console.log` হতো), কিন্তু **এখনো `fetchLandingPageServerSide(slug)` কল করে `LandingPage` মডেলের আসল ডেটা (দাম, প্রোডাক্ট নাম, ছবি) fetch করে না** — `landingService.js`-এ ফাংশনটা প্রস্তুত থাকলেও অব্যবহৃত।
2. `TemplateOneBody`/`OrderSection`-এর সব সেকশন এখনো হার্ডকোডেড ("আনার দানা", `PRODUCT_PRICE = 890`, `productCode: "P-Landing01"`)।
3. তবে `slug` prop এখন কাজে লাগছে — `OrderSection`-এ draft autosave (`saveDraftOrder(slug, ...)`, §৬.১) এবং `TemplateOneBody`-তে engagement tracking (`initEngagementTracking(slug)`, §৬.২) দুটোই slug-ভিত্তিক।
4. ✅ **ফিক্সড:** আগে `OrderSection.jsx`-এর `handleSubmit` raw `axios.post` ব্যবহার করত (`landingService.submitOrder` না), তাই চূড়ান্ত অর্ডারের সাথে `fbp`/`fbc`/UTM/সেশন-আইডি পাঠানো হতো না। এখন `landingService.submitOrder` ব্যবহার করা হয় — সাথে ব্রাউজার ফিঙ্গারপ্রিন্ট হ্যাশও যোগ হয়েছে (§৯ দেখুন), তাই এখন এই পুরো tracking payload সরাসরি `Order.tracking`-এ যাচ্ছে।
5. ✅ **ফিক্সড (ড্রাফট অর্ডার নাম বাগ):** `server/controllers/publicTrackingController.js`-এর `saveDraftOrder`-এ `buildUpdate({ customerName, ... })` পাঠানো হচ্ছিল, কিন্তু `DraftOrder` স্কিমার ফিল্ডের নাম `name` — Mongoose strict-schema হওয়ায় অচেনা `customerName` ফিল্ড চুপচাপ বাদ পড়ে যাচ্ছিল, ফলে ইনকমপ্লিট অর্ডারে কাস্টমারের নাম কখনো সেভ হতো না। এখন `name: customerName` করে ঠিক করা হয়েছে (ক্লায়েন্ট আগে থেকেই সঠিক `draft.name` পড়ছিল)।

## ৭. পরবর্তী কাজের জন্য সুপারিশ (Cleanup / TODO তালিকা)

1. ~~cron বাগ ফিক্স~~ ✅ **ফিক্সড** — বিস্তারিত §৮.১-এ।
2. **lanidgUi-এ dynamic rendering এখনো যোগ হয়নি** — `[slug]/page.js` → `fetchLandingPageServerSide(slug)` কল করে ডেটা আনা → `TemplateOneBody`-কে prop হিসেবে পাস করা → প্রতিটা সেকশন কম্পোনেন্টকে (HeroTop, OrderSection, ইত্যাদি) props নেওয়ার মতো রিফ্যাক্টর করা (দেখুন §৬.৫)। *(এখনো বাকি)*
3. ~~`OrderSection.jsx`-কে `landingService.submitOrder` ব্যবহার করানো~~ ✅ **ফিক্সড** — বিস্তারিত §৬.৫ আইটেম ৪-এ। (তবে `productCode` এখনো হার্ডকোড — page ডেটা থেকে ডাইনামিক করা এখনো বাকি, আইটেম ২-এর সাথে যুক্ত।)
4. ~~Purchase CAPI ইভেন্ট implement করা~~ ✅ **ফিক্সড** — বিস্তারিত §৬.৩-এ। শুধু ল্যান্ডিং পেজ অর্ডারে যায় (`origin === "landing_page"`)।
5. ~~Session/এনগেজমেন্ট ডেটা ড্যাশবোর্ডে surface করা~~ ✅ **ফিক্সড** — নতুন `/dashboard/sessions` পেজ, বিস্তারিত §১০-এ।
6. **ডেড/কমেন্ট-আউট কোড পরিষ্কার করা** — `models/Order.js`-এর উপরের কমেন্ট-আউট ব্লক, `controllers/facebookController.js`-এর কমেন্ট-আউট পুরনো ভার্সন, `orderController copy.js`, `steadfastController copy.js`, `facebookPages copy.js` — এগুলো ব্যবহৃত হয় না, রিপো থেকে সরানো যায়। *(এখনো বাকি)*
7. অন্য প্রোডাক্টের জন্য নতুন টেমপ্লেট বানানোর সময় (`templates/` ফোল্ডার) — একবার ডায়নামিক রেন্ডারিং হয়ে গেলে একই টেমপ্লেট বিভিন্ন `LandingPage` slug দিয়ে reuse করা সম্ভব হবে, আলাদা কোড লেখা লাগবে না। *(এখনো বাকি)*
8. ~~কাস্টমার ফ্রড/ডুপ্লিকেট ডিটেকশন সিস্টেম~~ ✅ **সম্পূর্ণ Implement করা হয়েছে** — বিস্তারিত §৯-এ (এখন এটা আর "planned" না)।
9. **`/dashboard/event-logs` পেজে নেভিগেশন লিংক নেই** — ব্যাকএন্ড+ফ্রন্টএন্ড (মডেল, কন্ট্রোলার, রুট, `EventLogViewer.jsx`, পেজ) সবকিছু আগে থেকেই সম্পূর্ণ তৈরি ছিল, শুধু `SearchAndMenu.jsx`-এর মেনুতে লিংক যোগ করা বাকি (আলোচনা হয়েছিল, এখনো কোডে যোগ করা হয়নি)।
10. **ImgBB URL থেকে ছবি দেখানো** — অ্যাডমিন `LandingPageForm.jsx`-এ "প্রোডাক্ট ছবি (URL)" ফিল্ডে যেকোনো ইমেজ URL (যেমন ImgBB) দিতে পারে, কিন্তু `lanidgUi`-এর `next.config.js`-এ কোনো `images.remotePatterns` সেট করা নেই — Next.js-এর `<Image>` কম্পোনেন্ট (ImageCarousel/HeroTop/TrustSection-এ ব্যবহৃত) হোয়াইটলিস্ট না-করা ডোমেইনের ছবি রেন্ডার করতে অস্বীকার করবে। ফিক্স: `lanidgUi/next.config.js`-এ `images: { remotePatterns: [{ hostname: "i.ibb.co" }] }` যোগ করা — আলোচনা শুরু হয়েছিল, কোড পরিবর্তন এখনো করা হয়নি।
11. **`ViewContent` ও `InitiateCheckout` CAPI ইভেন্ট** — এখনো implement করা হয়নি (§৬.৩ দেখুন)।
12. **পুরনো (ফিক্সের আগে তৈরি হওয়া) ল্যান্ডিং পেজ অর্ডারে `origin` ফিল্ড মাইগ্রেট করা** — নতুন অর্ডারে ঠিকভাবে `origin: "landing_page"` সেট হচ্ছে, কিন্তু ফিক্সের আগের পুরনো অর্ডারগুলোর `origin` ডিফল্ট `"manual"` হিসেবে থেকে যাবে (এমনকি সেগুলো আসলে ল্যান্ডিং পেজ থেকে আসা হলেও) — নিরাপদ দিকেই ভুল (Purchase ইভেন্ট মিস হবে, বাড়তি যাবে না), কিন্তু চাইলে `tracking.sessionId` আছে এমন পুরনো অর্ডার খুঁজে একটা মাইগ্রেশন স্ক্রিপ্ট দিয়ে ঠিক করা যায়।

---

## ৮. চেঞ্জলগ (Applied Fixes)

### ৭.১ Backend — cron job ফিল্ড নেম মিসম্যাচ ফিক্স
**ফাইল:** `server/jobs/scheduledOrderReleaser.js`

**সমস্যা ছিল:** cron job `Order` মডেলে না-থাকা `releaseDate` ফিল্ড দিয়ে কুয়েরি করছিল, কিন্তু আসল ফিল্ডের নাম `scheduledDate` (দেখুন `scheduleOrder` কন্ট্রোলার)। ফলে প্রতিদিন রাত ১২টায় (UTC) চলা এই জব কখনো কোনো ডকুমেন্ট ম্যাচ করত না — শিডিউলড অর্ডার কখনো অটোমেটিক্যালি "Pending"-এ রিলিজ হতো না।

**ফিক্স:**
```diff
  const filter = {
    orderStatus: "Scheduled",
-   releaseDate: { $lte: today },
+   scheduledDate: { $lte: today },
  };
```
এখন প্রতিদিন cron চলার সময় যেসব `Scheduled` অর্ডারের `scheduledDate` আজকের তারিখ বা তার আগে, সেগুলো ঠিকভাবে খুঁজে পেয়ে `orderStatus: "Pending"`-এ রিলিজ করবে এবং টাইমলাইনে অ্যাক্টিভিটি লগ যোগ করবে।

### ৭.২ Frontend — শিডিউল করা অর্ডার তারিখের আগে "Pending"/"All" সেকশনে দেখানো বন্ধ
**ফাইল:** `client/src/context/OrderContext.jsx`

**সমস্যা ছিল:** কোনো অর্ডার শিডিউল করা হলে (`orderStatus: "Scheduled"`) সেটা "Pending" ট্যাবে আসত না (যেহেতু স্ট্যাটাস মেলে না), কিন্তু **"All" ট্যাবে দেখা যেত** — কারণ `allPendingOrder`-এর ফিল্টার শুধু `Booked`/`Cancelled`/`Delivered`/`Confirmed` বাদ দিত, `Scheduled`-কে বাদ দিত না।

**ফিক্স:** একটা হেল্পার ফাংশন `isFutureScheduled(order)` যোগ করা হয়েছে, যেটা চেক করে অর্ডারটা `Scheduled` কিনা এবং তার `scheduledDate` এখনো ভবিষ্যতে কিনা। `allPendingOrder`-এর ফিল্টারে এটা যোগ করা হয়েছে:

```diff
  const allPendingOrder = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    return orders.filter(
      (order) =>
        order &&
        order._id &&
        order.orderStatus !== "Booked" &&
        order.orderStatus !== "Cancelled" &&
        order.orderStatus !== "Delivered" &&
        order.orderStatus !== "Confirmed" &&
+       !isFutureScheduled(order),
    );
- }, [orders]);
+ }, [orders, isFutureScheduled]);
```

**আচরণ:**
- অর্ডার শিডিউল করা হলে সেটা **"Pending" ও "All" — কোথাও দেখাবে না**, যতক্ষণ না `scheduledDate` পার হয়।
- `scheduledDate` পার হয়ে গেলে (cron job রিলিজ করার আগেও, সেফটি নেট হিসেবে) অর্ডারটা আবার দেখা যাবে — যাতে কোনো কারণে সার্ভার ডাউন থাকলে বা cron মিস হলে ডেটা "হারিয়ে" না যায়, মডারেটর অন্তত ম্যানুয়ালি খেয়াল করতে পারে।
- যেহেতু `STATUS_TABS`-এ কোনো আলাদা "Scheduled" ট্যাব নেই, তাই এই দুটো ফিক্স মিলিয়ে এখন শিডিউলড অর্ডার তার নির্ধারিত তারিখ না আসা পর্যন্ত ড্যাশবোর্ডের কোথাও (Pending/All/অন্য কোনো স্ট্যাটাস ট্যাব) দেখা যাবে না, এবং তারিখ আসার পর ব্যাকএন্ড cron স্বয়ংক্রিয়ভাবে সেটাকে "Pending"-এ ফিরিয়ে এনে স্বাভাবিকভাবে ভিজিবল করে দেবে।

### ৮.৩ Backend — ড্রাফট অর্ডারে কাস্টমারের নাম সেভ না হওয়া বাগ ফিক্স
**ফাইল:** `server/controllers/publicTrackingController.js`

**সমস্যা ছিল:** `saveDraftOrder`-এ `buildUpdate({ landingPageSlug, customerName, phone, address, ... })` পাঠানো হচ্ছিল, কিন্তু `DraftOrder` স্কিমার ফিল্ডের নাম `customerName` না, `name`। Mongoose ডিফল্টভাবে strict schema মেনে চলায় অচেনা `customerName` ফিল্ডটা প্রতিবার চুপচাপ বাদ পড়ে যাচ্ছিল (কোনো error ছাড়াই) — ফলে ইনকমপ্লিট/ড্রাফট অর্ডারে কাস্টমারের নাম কখনো সেভ হতো না, শুধু ফোন/ঠিকানা সেভ হতো।

**ফিক্স:**
```diff
  const update = buildUpdate({
    landingPageSlug,
-   customerName,
+   name: customerName,
    phone,
    address,
```
ক্লায়েন্ট সাইড (`DraftOrderCard.jsx`) আগে থেকেই সঠিক `draft.name` পড়ছিল, তাই শুধু এই লিখন-পক্ষের (write-side) এক লাইন বদলালেই যথেষ্ট ছিল।

### ৮.৪ Backend — Purchase CAPI ইভেন্ট শুধু ল্যান্ডিং পেজ অর্ডারে সীমাবদ্ধ করা
**ফাইল:** `server/models/Order.js`, `server/controllers/publicLandingController.js`, `server/sockets/orderSocket.js`

**সমস্যা ছিল:** `orderSocket.js`-এর `handleUpdateStatus`-এ কোনো অর্ডার "Confirmed" স্ট্যাটাসে গেলেই `triggerPurchaseEvent()` কল হতো — এটা ল্যান্ডিং পেজ থেকে আসা অর্ডার হোক বা অ্যাডমিন/মডারেটর ম্যানুয়ালি WhatsApp/Messenger থেকে পেস্ট করা অর্ডার হোক, দুটোতেই সমানভাবে Purchase ইভেন্ট Meta-তে চলে যেত। ম্যানুয়াল অর্ডারে কোনো `fbp`/`fbc`/সেশন অ্যাট্রিবিউশন ডেটা থাকে না বলে এই ইভেন্টগুলো Meta-র ক্যাম্পেইন অপ্টিমাইজেশনে ভুল সিগন্যাল দিচ্ছিল।

**ফিক্স:**
1. `Order` মডেলে নতুন `origin` ফিল্ড (`"landing_page"` | `"manual"`, ডিফল্ট `"manual"`)।
2. `publicLandingController.js`-এ ল্যান্ডিং পেজ অর্ডার তৈরির সময় `origin: "landing_page"` এক্সপ্লিসিটলি সেট করা।
3. `orderSocket.js`-এ শর্ত যোগ:
```diff
- if (newStatus === "Confirmed") {
+ if (newStatus === "Confirmed" && updatedOrder.origin === "landing_page") {
    triggerPurchaseEvent(updatedOrder)...
  }
```
এখন থেকে ম্যানুয়াল অর্ডার Confirm করলে (ডিফল্ট `origin: "manual"` থাকায়) Purchase ইভেন্ট আর যায় না।

> ⚠️ **নোট:** এই ফিক্স শুধু নতুন তৈরি হওয়া অর্ডারের জন্য কাজ করে — ফিক্সের আগে ডাটাবেজে থাকা পুরনো ল্যান্ডিং-পেজ অর্ডারগুলোর `origin` ফাঁকা/ডিফল্ট (`"manual"`) থেকে যাবে (দেখুন §৭ আইটেম ১২)।

### ৮.৫ Frontend — Meta Pixel PageView ইভেন্ট ~১ সেকেন্ড ডিলে
**ফাইল:** `lanidgUi/src/app/layout.js`

**উদ্দেশ্য:** PageView ইভেন্টের ওপর ভিত্তি করে Meta-তে Custom Audience বানানোর সময় দ্রুত বাউন্স করা ভিজিটর/বট এই অডিয়েন্সে না ঢোকে, সেজন্য।

**ফিক্স:** `fbq('init', ...)` সাথে সাথে চলে (যাতে `_fbp` কুকি দ্রুত সেট হয় ও Lead/Purchase CAPI ইভেন্টে ব্যবহারযোগ্য থাকে), কিন্তু `fbq('track', 'PageView')` এখন `setTimeout(..., 1000)`-এ র‍্যাপ করা — পেজ লোডের ১ সেকেন্ড পর পাঠানো হয়।

---

## ৯. কাস্টমার ফ্রড/ডুপ্লিকেট ডিটেকশন সিস্টেম ✅ (সম্পূর্ণ Implement করা হয়েছে)

*(আগে এই সেকশনে শুধু স্পেক-সারাংশ ছিল, "planned" হিসেবে। এখন পুরোটাই কোডবেসে আছে — নিচে ফাইল-বাই-ফাইল বর্ণনা।)*

**মূলনীতি (অপরিবর্তিত):** কোথাও কোনো অটোমেটিক ব্লক হয় না — সিস্টেম শুধু আগের অর্ডারের সাথে ম্যাচ খুঁজে ফ্ল্যাগ করে, চূড়ান্ত Approve/Ignore/Block সিদ্ধান্ত সবসময় অ্যাডমিন/মডারেটরের।

### ৯.১ Backend

| ফাইল | কাজ |
|---|---|
| `server/models/BlockedCustomer.js` (নতুন) | phone/fingerprintHash/ip/fbp/fbc/fbclid দিয়ে ম্যানুয়ালি ব্লক করা কাস্টমার রাখে — যেকোনো একটা ফিল্ড ম্যাচ করলেই ব্লক ধরা হয়। |
| `server/models/Order.js` | নতুন `fraudCheck{}` (isSuspicious, reasons[] প্রতি-রুল matchedOrderIds সহ, reviewStatus: none/pending/approved/ignored/blocked, reviewedBy/reviewedAt), নতুন `tracking.fingerprintHash`, নতুন `origin` (§৮.৪ দেখুন)। |
| `server/models/DraftOrder.js`, `server/models/Session.js` | `tracking.fingerprintHash` ফিল্ড যোগ (consistency-র জন্য)। |
| `server/utils/fraudDetection.js` (নতুন) | `checkFraudSignals({phone, fingerprintHash, ip, fbp, fbc, fbclid, excludeOrderId})` — Phone/Fingerprint/IP/Facebook চারটা রুল দিয়ে আগের `Order`-এর সাথে ম্যাচ খুঁজে কারণসহ রিটার্ন করে। `checkBlocked({...})` — `BlockedCustomer` লিস্টের সাথে মেলে কিনা চেক করে। |
| `server/controllers/publicLandingController.js` | অর্ডার তৈরির **আগে** `checkBlocked()` — ম্যাচ পেলে `403 { blocked: true }`, অর্ডার তৈরিই হয় না। তৈরির **পরে** `checkFraudSignals()` — ম্যাচ পেলে `fraudCheck.isSuspicious = true` সেভ হয় (`reviewStatus: "pending"`)। |
| `server/controllers/orderController.js` | `createManualOrder`-এও (ম্যানুয়ালি পেস্ট করা অর্ডার) এখন `checkFraudSignals({ phone })` কল হয় (শুধু ফোন-ম্যাচ, যেহেতু fingerprint/IP/FB ডেটা নেই)। নতুন `reviewFraudOrder` (`PATCH /:id/fraud-review`, action: approve/ignore/block — block করলে `BlockedCustomer` রেকর্ড তৈরি হয়)। নতুন `getFraudMatches` (`GET /:id/fraud-matches` — ম্যাচ হওয়া প্রতিটা আগের অর্ডারের পূর্ণ তথ্য রিটার্ন করে: নাম, ফোন, প্রোডাক্ট, টাকা, orderStatus, courier.courierStatus, তারিখ)। |
| `server/controllers/blockController.js` + `server/routes/blockRoutes.js` (নতুন) | `/api/blocked-customers` (admin-only) — `GET /` (লিস্ট), `POST /` (ম্যানুয়ালি ব্লক, শুধু ফোন দিয়েও করা যায়), `POST /from-order/:orderId` (একটা অর্ডারের সব আইডেন্টিফায়ার দিয়ে ব্লক), `PATCH /:id/unblock`। |

### ৯.২ Admin Dashboard (client)

| ফাইল | কাজ |
|---|---|
| `client/src/components/orders/OrderCard.jsx` | `order.fraudCheck.isSuspicious` হলে "⚠️ Multiple Orders" Badge (blocked হলে লাল, ignored হলে ধূসর) — **ল্যান্ডিং পেজ ও ম্যানুয়াল, দুই ধরনের অর্ডারেই** দেখায় (§৯.১-এ `createManualOrder`-এও ফ্রড-চেক যোগ হওয়ায়)। |
| `client/src/components/orders/FraudDetectionModal.jsx` (নতুন) | Badge-এ ক্লিক করলে খোলে — কোন রুল (Phone/Fingerprint/IP/Facebook) ম্যাচ করেছে তা দেখায়, `getFraudMatches` API কল করে ম্যাচ হওয়া প্রতিটা আগের অর্ডারের **পূর্ণ বিবরণ** (orderStatus + courier/delivery status রঙিন ব্যাজ আকারে) দেখায়। তিনটা অ্যাকশন বাটন: **Approve** (reviewStatus="approved", Badge চলে যায়), **Ignore** (reviewStatus="ignored", কেউ ব্লক হয় না), **Block Customer** (reviewStatus="blocked" + নতুন `BlockedCustomer` রেকর্ড তৈরি, কনফার্মেশন + ঐচ্ছিক কারণ-সহ)। |
| `client/src/app/dashboard/blocked-customers/page.js` (নতুন) | ব্লক করা সব কাস্টমারের লিস্ট + ফোন নম্বর দিয়ে সরাসরি ম্যানুয়াল ব্লক করার ফর্ম + আনব্লক বাটন। |
| `client/src/services/blockService.js` (নতুন), `orderService.js` | `orderService.reviewFraud()`, `orderService.getFraudMatches()` যোগ করা হয়েছে। |
| `client/src/components/layout/SearchAndMenu.jsx` | admin-only মেনুতে "🚫 ব্লক কাস্টমার" লিংক যোগ। |

### ৯.৩ Landing Page (lanidgUi)

| ফাইল | কাজ |
|---|---|
| `lanidgUi/src/utils/fingerprint.js` (নতুন) | canvas + WebGL রেন্ডারিং হ্যাশ + `navigator`/`screen` প্রোপার্টি একসাথে করে SHA-256 হ্যাশ বানায় (`getFingerprintHash()`), ট্যাব চলাকালীন cache থাকে। |
| `lanidgUi/src/utils/tracking.js` | নতুন `getTrackingPayloadWithFingerprint(slug)` — fingerprint হ্যাশ-সহ ট্র্যাকিং পেলোড রিটার্ন করে (async)। |
| `lanidgUi/src/services/landingService.js` | `submitOrder` এখন এই নতুন পেলোড ব্যবহার করে। |
| `lanidgUi/src/components/template1/OrderSection.jsx` | raw `axios.post` থেকে `landingService.submitOrder` ব্যবহারে সুইচ (§৮.৩-এর সাথে সম্পর্কিত বাগ ফিক্সও একসাথে হয়ে গেছে — §৬.৫ আইটেম ৪)। সার্ভার `403 { blocked: true }` রিটার্ন করলে `BlockedCustomerPopup` দেখায়। |
| `lanidgUi/src/components/template1/BlockedCustomerPopup.jsx` (নতুন) | ব্লক করা কাস্টমার আবার অর্ডার করার চেষ্টা করলে দেখানো হয় — WhatsApp-এ যোগাযোগ করার বাটন (`FloatingContactButton`-এ ব্যবহৃত একই নম্বর: `+8801886362484`)। |

### ৯.৪ যা এখনো বাকি (এই ফিচারের ভেতরে)
- ম্যানুয়াল অর্ডারে শুধু ফোন-ম্যাচিং হয় (fingerprint/IP/FB নেই, কারণ raw টেক্সট পেস্টে সেই ডেটা আসে না) — এটা ডিজাইন অনুযায়ীই, বাগ না।
- `Session` মডেলেও `fingerprintHash`/`ip` আছে কিন্তু `checkFraudSignals()` এখনো শুধু `Order` কালেকশন কুয়েরি করে, `Session`-কে সিগন্যাল হিসেবে ব্যবহার করে না (ভবিষ্যতে চাইলে সম্প্রসারণ করা যায়)।

---

## ১০. নতুন ফিচার — সেশন (এনগেজমেন্ট) অ্যানালিটিক্স ড্যাশবোর্ড

*(§৬.২-এ যে ডেটা কালেক্ট হচ্ছিল কিন্তু কোথাও দেখানো হচ্ছিল না, সেটা এখন সম্পূর্ণ একটা admin পেজে টেবিল + গ্রাফ আকারে দেখানো হয়।)*

| ফাইল | কাজ |
|---|---|
| `server/controllers/sessionController.js` (নতুন) | `getSessionSummary` — date-range aggregation দিয়ে: টোটাল সেশন, bounce rate, return visitor %, গড় সময়/স্ক্রল-ডেপথ, দৈনিক ট্রেন্ড (chart-এর জন্য), ল্যান্ডিং-পেজ-ভিত্তিক ব্রেকডাউন, সোর্স/UTM-ভিত্তিক ব্রেকডাউন। `listSessions` — ফিল্টারযোগ্য (bounce/return visitor), পেজিনেটেড raw সেশন লিস্ট। |
| `server/routes/sessionRoutes.js` (নতুন) | `/api/sessions` (admin-only): `GET /summary`, `GET /`। |
| `client/src/services/sessionService.js` (নতুন) | API কল। |
| `client/src/components/dashboard/SessionStatsCards.jsx`, `SessionTrendChart.jsx`, `SessionBreakdownCharts.jsx`, `SessionTable.jsx` (নতুন) | যথাক্রমে সামারি কার্ড, দৈনিক সেশন-vs-বাউন্স চার্ট (`recharts` — আগে থেকেই dependency-তে ছিল), ল্যান্ডিং-পেজ/সোর্স ব্রেকডাউন চার্ট, ফিল্টারযোগ্য পেজিনেটেড টেবিল। |
| `client/src/app/dashboard/sessions/page.js` (নতুন) | সব একসাথে জোড়া, আগে থেকে থাকা `DateRangeFilter` কম্পোনেন্ট রিইউজ করে (আজ/গতকাল/৭দিন/৩০দিন/১বছর/কাস্টম)। |
| `client/src/components/layout/SearchAndMenu.jsx`, `client/src/app/dashboard/page.js` | admin-only "📈 সেশন অ্যানালিটিক্স" লিংক যোগ (মেনু + মূল ড্যাশবোর্ডের কুইক-লিংক)। |

---

## ১১. Meta Pixel/CAPI ইভেন্ট — বর্তমান পূর্ণ চিত্র (একনজরে)

| ইভেন্ট | কখন | কীভাবে | স্ট্যাটাস |
|---|---|---|---|
| `PageView` | পেজ লোডের ~১ সেকেন্ড পর | ব্রাউজার Pixel | ✅ (§৮.৫) |
| `Lead` | কাস্টমার ফর্ম সাবমিট করলে | সার্ভার CAPI | ✅ |
| `Purchase` | অ্যাডমিন "Confirmed" করলে, শুধু `origin === "landing_page"` | সার্ভার CAPI | ✅ (§৮.৪) |
| `ViewContent` | প্রোডাক্ট পেজ দেখলে | — | ❌ এখনো নেই |
| `InitiateCheckout` | ফর্মে টাইপ শুরু করলে | — | ❌ এখনো নেই |

`EventLog` মডেল/কন্ট্রোলার/`/dashboard/event-logs` পেজ — সব আগে থেকেই সম্পূর্ণ তৈরি ছিল, শুধু নেভিগেশন মেনুতে লিংক নেই (§৭ আইটেম ৯)।