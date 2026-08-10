# প্রজেক্ট সামারি — OMS (oms-main) + Anardana Landing (anardanaLanding-main)

*পুরো কোডবেস (client + server, উভয় রিপো) শুরু থেকে শেষ পর্যন্ত পড়ে তৈরি করা হয়েছে।*

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
- ⚠️ **লক্ষণীয়:** এই ডেটা (bounce rate, scroll depth, return visitor ইত্যাদি) এখনো কোনো ড্যাশবোর্ড/অ্যানালিটিক্স UI-তে দেখানো হয় না — `dashboardController.js`-এ `Session` মডেলের কোনো ব্যবহার নেই। ডেটা কালেক্ট হচ্ছে, কিন্তু এখনো surface করা হয়নি।

### ৬.৩ Meta Conversions API (CAPI) ইন্টিগ্রেশন

- **`server/utils/metaCapi.js`** — `sendCapiEvent({eventName, orderId, sessionId, userData, customData})`: ফোন/ইমেইল SHA-256 হ্যাশ করে (Meta-র নিয়ম মেনে, বাংলাদেশি নম্বরকে `880`-প্রিফিক্সড E.164-এ নিয়ে গিয়ে), Graph API-তে POST করে, প্রতিটা ইভেন্ট **`EventLog`** মডেলে সেভ থাকে (payload + Meta response + status: pending/sent/failed)। কখনো throw করে না, ব্যর্থ হলেও কলিং কোড না ভাঙার জন্য ডিজাইন করা।
- **`server/models/EventLog.js`** — `eventName` (Purchase/Lead/InitiateCheckout/ViewContent/PageView), unique `eventId` (dedup key, ভবিষ্যতে ব্রাউজার Pixel-এর সাথে মেলানোর জন্য), status, retryCount।
- **এখন যা পাঠানো হয়:** কাস্টমার ল্যান্ডিং পেজ থেকে অর্ডার সাবমিট করলে শুধু **`Lead`** ইভেন্ট যায় (`publicLandingController.submitPublicOrder`-এর শেষে)।
- ⚠️ **এখনো implement হয়নি (TODO, কমেন্টে উল্লেখ আছে):** অ্যাডমিন অর্ডার "Confirmed" করলে **`Purchase`** ইভেন্ট পাঠানোর কথা ছিল (কোডের কমেন্টে লেখা আছে), কিন্তু `orderController.js`-এ কোথাও `sendCapiEvent`/`Purchase` কল নেই — এই অংশটা এখনো বাকি।
- **`retryEvent(eventLogId)`** — আগের payload অপরিবর্তিত রেখে আবার পাঠানোর ফাংশন, ব্যবহৃত হয় `eventLogController`/`eventLogRoutes` থেকে, ক্লায়েন্টে `EventLogViewer.jsx` (dashboard/event-logs পেজ) থেকে অ্যাডমিন ম্যানুয়ালি রিট্রাই করতে পারে।

### ৬.৪ কাস্টমার টাইমলাইন / প্রোফাইল (Admin-only)

- **`GET /api/customers/timeline?phone=01XXXXXXXXX`** (`customerController.getCustomerTimeline`, `customerRoutes.js`, শুধু admin) — একটা ফোন নম্বরের বিপরীতে সব `Order` + সব `DraftOrder` একসাথে টেনে আনে, একটা `summary` (মোট অর্ডার, confirmed/delivered/cancelled/pending কাউন্ট, মোট খরচ, ভিন্ন ভিন্ন নাম/ঠিকানা কতগুলো ব্যবহার করেছে, draft কাউন্ট) এবং একটা একত্রিত, তারিখ অনুযায়ী সাজানো `timeline` (অর্ডার তৈরি + প্রতিটা অ্যাক্টিভিটি + draft) রিটার্ন করে।
- এটাই মূলত OMS-এর "একই কাস্টমার আগে কী করেছে" প্রশ্নের বর্তমান উত্তর — তবে এখনো ম্যানুয়াল লুকআপ (ফোন নম্বর দিয়ে সার্চ করতে হয়), অর্ডার লিস্টে অটোমেটিক badge/আলাদা করে দেখানো হয় না (দেখুন §৮ নিচে, ইউজারের পাঠানো ডিটেকশন-সিস্টেম স্পেকের সাথে তুলনা করুন)।

### ৬.৫ ল্যান্ডিং পেজ কানেকশন — বর্তমান অবস্থা (রিপো এখন `lanidgUi`)

আগের সামারির §৪.৩-এ যা লেখা ছিল তার অনেকটাই **এখনো একই রকম আছে**, শুধু draft/session ট্র্যাকিং যোগ হয়েছে:

1. `[slug]/page.js` এখন `slug`-কে `TemplateOneBody`-তে prop হিসেবে পাস করে (আগে শুধু `console.log` হতো), কিন্তু **এখনো `fetchLandingPageServerSide(slug)` কল করে `LandingPage` মডেলের আসল ডেটা (দাম, প্রোডাক্ট নাম, ছবি) fetch করে না** — `landingService.js`-এ ফাংশনটা প্রস্তুত থাকলেও অব্যবহৃত।
2. `TemplateOneBody`/`OrderSection`-এর সব সেকশন এখনো হার্ডকোডেড ("আনার দানা", `PRODUCT_PRICE = 890`, `productCode: "P-Landing01"`)।
3. তবে `slug` prop এখন কাজে লাগছে — `OrderSection`-এ draft autosave (`saveDraftOrder(slug, ...)`, §৬.১) এবং `TemplateOneBody`-তে engagement tracking (`initEngagementTracking(slug)`, §৬.২) দুটোই slug-ভিত্তিক।
4. **অর্ডার সাবমিট করার সময়ও এখনো পুরনো সমস্যা রয়ে গেছে:** `OrderSection.jsx`-এর `handleSubmit` এখনো raw `axios.post` ব্যবহার করে (`landingService.submitOrder` না), তাই চূড়ান্ত অর্ডারের সাথে `fbp`/`fbc`/UTM/সেশন-আইডি পাঠানো হয় **না** — যদিও একই কাস্টমারের attribution ডেটা তার আগের draft/session রেকর্ডে (§৬.১, §৬.২) আলাদাভাবে সেভ হয়ে থাকে (ফোন নম্বর/সেশন দিয়ে পরে মেলানো সম্ভব, কিন্তু সরাসরি `Order.tracking`-এ যায় না)।

## ৭. পরবর্তী কাজের জন্য সুপারিশ (Cleanup / TODO তালিকা)

1. ~~cron বাগ ফিক্স~~ ✅ **ফিক্সড** — বিস্তারিত §৮.১-এ।
2. **lanidgUi-এ dynamic rendering এখনো যোগ হয়নি** — `[slug]/page.js` → `fetchLandingPageServerSide(slug)` কল করে ডেটা আনা → `TemplateOneBody`-কে prop হিসেবে পাস করা → প্রতিটা সেকশন কম্পোনেন্টকে (HeroTop, OrderSection, ইত্যাদি) props নেওয়ার মতো রিফ্যাক্টর করা (দেখুন §৬.৫)।
3. **`OrderSection.jsx`-কে `landingService.submitOrder` ব্যবহার করানো** — যাতে চূড়ান্ত অর্ডারের সাথেও tracking payload (attribution/fbp/fbc/sessionId) সরাসরি যায়, এবং `productCode` হার্ডকোড না থেকে page ডেটা থেকে আসে (draft/session-এ আলাদাভাবে এই ডেটা যাচ্ছে, কিন্তু `Order.tracking`-এ যাচ্ছে না — §৬.৫)।
4. **Purchase CAPI ইভেন্ট implement করা** — অর্ডার "Confirmed" হলে `sendCapiEvent({eventName: "Purchase", ...})` কল করা এখনো বাকি, শুধু কমেন্টে প্ল্যান লেখা আছে (§৬.৩)।
5. **Session/এনগেজমেন্ট ডেটা ড্যাশবোর্ডে surface করা** — bounce rate, scroll depth, return visitor% ইত্যাদি এখন শুধু DB-তে জমা হচ্ছে, কোনো UI/অ্যানালিটিক্সে দেখানো হচ্ছে না (§৬.২)।
6. **ডেড/কমেন্ট-আউট কোড পরিষ্কার করা** — `models/Order.js`-এর উপরের কমেন্ট-আউট ব্লক, `controllers/facebookController.js`-এর কমেন্ট-আউট পুরনো ভার্সন, `orderController copy.js`, `steadfastController copy.js`, `facebookPages copy.js` — এগুলো ব্যবহৃত হয় না, রিপো থেকে সরানো যায়।
7. অন্য প্রোডাক্টের জন্য নতুন টেমপ্লেট বানানোর সময় (`templates/` ফোল্ডার) — একবার ডায়নামিক রেন্ডারিং হয়ে গেলে একই টেমপ্লেট বিভিন্ন `LandingPage` slug দিয়ে reuse করা সম্ভব হবে, আলাদা কোড লেখা লাগবে না।
8. **কাস্টমার ফ্রড/ডুপ্লিকেট ডিটেকশন সিস্টেম — এখনো implement করা হয়নি (planned)।** এখন শুধু `OrderList.jsx`-এ ক্লায়েন্ট-সাইড একটা সাধারণ ডুপ্লিকেট-ফোন কাউন্ট আছে (`utils/orderHelpers.js` → `multupleOrderCheck`, বর্তমানে লোড হওয়া অর্ডারের মধ্যেই শুধু গোনে)। ইউজারের বর্ণনা করা স্পেক (Phone/Browser Fingerprint/IP/Facebook Tracking Match, Admin-এর জন্য Badge + Detection Modal, Manual Block System, Blocked Customer Popup) সম্পূর্ণ নতুন — বিস্তারিত নিচে §৯-এ।

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

---

## ৯. প্রস্তাবিত ফিচার — কাস্টমার ফ্রড/ডুপ্লিকেট ডিটেকশন সিস্টেম (এখনো implement করা হয়নি)

*(এটা কোডবেসে নেই — ইউজারের দেওয়া স্পেক ডকুমেন্ট থেকে সারাংশ + কোডবেসে কী কী ইতিমধ্যে ভিত্তি হিসেবে আছে তা নোট করা হলো, যাতে ভবিষ্যতে implement করার সময় কাজে লাগে।)*

### ৯.১ স্পেকের সারাংশ
নতুন Order এলে সিস্টেম স্বয়ংক্রিয়ভাবে আগের Order-এর সাথে মিল খুঁজবে (Phone/Browser Fingerprint/IP/Facebook Tracking — fbp, fbc, fbclid), কিন্তু কাউকে **কখনো অটোমেটিক Block করবে না**। Order Card-এ Badge দেখাবে ("Multiple Orders Detected" ইত্যাদি), ক্লিক করলে একটা Modal-এ কারণসহ (✅ Same Phone, ✅ Same Fingerprint ইত্যাদি) আগের ম্যাচ হওয়া অর্ডারগুলো দেখাবে, এবং Admin ম্যানুয়ালি Approve/Ignore/Block করবে। Block করা কাস্টমার পরে আবার অর্ডার করার চেষ্টা করলে ল্যান্ডিং পেজে একটা Popup দেখিয়ে WhatsApp-এ যোগাযোগ করতে বলবে।

### ৯.২ কোডবেসে যা ইতিমধ্যে ভিত্তি হিসেবে আছে
- **Phone Match (Rule ১):** সরাসরি `Order.castomerPhone`/`DraftOrder.phone` দিয়ে সম্ভব, `customerController.getCustomerTimeline` (§৬.৪) ইতিমধ্যে ফোন দিয়ে সব অর্ডার/draft একত্র করে — এটাকেই স্বয়ংক্রিয় ম্যাচিং-এর ভিত্তি হিসেবে ব্যবহার করা যায়।
- **IP Match (Rule ৩):** `Order.tracking.ip`, `Session.tracking.ip`, `DraftOrder.tracking.ip` — তিনটাতেই ইতিমধ্যে ক্লায়েন্ট IP সেভ হচ্ছে (`getClientIp()` হেল্পার দিয়ে)।
- **Facebook Tracking Match (Rule ৪):** `fbp`/`fbc`/`fbclid` — Order, Session, DraftOrder তিনটা মডেলেই `tracking{}` অবজেক্টে ইতিমধ্যে ফিল্ড আছে এবং ক্যাপচার হচ্ছে (`tracking.js` → `getTrackingPayload`)।
- **Browser Fingerprint (Rule ২):** ❌ এখনো নেই। কোনো ফাইলে canvas/WebGL hash, `navigator.hardwareConcurrency`/`deviceMemory` ইত্যাদি সংগ্রহ বা SHA-256 হ্যাশিং কোড নেই — এটা সম্পূর্ণ নতুন করে বানাতে হবে (client-side JS + নতুন `fingerprintHash` ফিল্ড Order/Session/DraftOrder মডেলে)।
- **Manual Block System:** ❌ এখনো নেই — কোনো `Block`/`BlockedCustomer` মডেল, `isBlocked` ফ্ল্যাগ, বা ব্লক-চেক মিডলওয়্যার কোডবেসে নেই। `publicLandingController.submitPublicOrder`-এ অর্ডার নেওয়ার আগে ব্লক-চেক করার কোনো লজিক নেই।
- **Detection Badge/Modal (UI):** ❌ এখনো নেই — `OrderCard.jsx`-এ শুধু ক্লায়েন্ট-সাইড সাধারণ ডুপ্লিকেট-ফোন কাউন্ট আছে (§৭ আইটেম ৮), কোনো Badge/Modal/Detection Reasons UI নেই।

**সংক্ষেপে:** Phone + IP + Facebook Tracking ম্যাচিং-এর কাঁচামাল (raw ডেটা) ইতিমধ্যে DB-তে জমা হচ্ছে (Order/Session/DraftOrder-এর `tracking{}`), তাই এই তিনটা Rule-এর জন্য একটা matching query/endpoint লেখাই মূল কাজ। Browser Fingerprint সম্পূর্ণ নতুন (client + server দুই পাশেই), এবং পুরো Manual Block System + Frontend Badge/Modal/Popup UI — সবকিছুই এখনো শূন্য থেকে বানাতে হবে।
