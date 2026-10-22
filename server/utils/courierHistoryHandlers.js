const { fetchCourierHistorySummary } = require("./courierHistoryProviders");

/**
 * --- Order আর DraftOrder-এর "কুরিয়ার হিস্ট্রি" কন্ট্রোলার — একটাই কমন লজিক ---
 * দুই ক্ষেত্রে কাজ হুবহু এক: ডকুমেন্ট খোঁজা → আগে ফেচ করা থাকলে সেটাই ফেরত → ফোন নম্বর নিয়ে
 * fetchCourierHistorySummary → ওই ডকুমেন্টেই সেভ → socket-এ broadcast → রেসপন্স।
 * যেটা আলাদা সেটা শুধু config হিসেবে আসে (কোন মডেল, ফোন কোথা থেকে, কিভাবে emit/enrich হবে)।
 * ড্রাফট থেকে কল হলে ড্রাফটেই সেভ হয়, অর্ডার থেকে হলে অর্ডারেই — কারণ `Model` আলাদা।
 *
 * config:
 *  - Model:        mongoose মডেল (Order / DraftOrder)
 *  - getPhones(doc): ফোন নম্বরের অ্যারে (Order: castomerPhone, Draft: [phone])
 *  - enrich(doc, cache): (ঐচ্ছিক, async) রেসপন্সে পাঠানোর আগে ডকুমেন্ট সাজানো — ড্রাফটে landing-page meta যোগ।
 *                  cache = প্রতি রিকোয়েস্টে একটা Map (একই ল্যান্ডিং পেজ বারবার না খোঁজার জন্য)
 *  - emit(io, enrichedDoc): socket broadcast
 *  - bulkScope(req): (ঐচ্ছিক) বাল্কে কোন ডকুমেন্টগুলো ইউজারের স্কোপে — একটা mongo ফিল্টার ফেরত দেয়
 *  - singleKey / bulkKey: রেসপন্সের কী ("order"/"orders", "draft"/"drafts")
 *  - idsKey:       বাল্ক রিকোয়েস্ট বডির কী ("orderIds" / "draftIds")
 *  - msg:          বাংলা মেসেজ ({ notFound, noPhone, noneFound, idsRequired, failed, bulkFailed })
 */
function createCourierHistoryHandlers(config) {
  const {
    Model,
    getPhones,
    enrich = async (doc) => doc,
    emit,
    bulkScope = () => ({}),
    singleKey,
    bulkKey,
    idsKey,
    msg,
    logName = Model.modelName,
  } = config;

  // ⚠️ courierHistory.all Mongoose-এ nested path — in-memory ডকুমেন্টে সবসময় একটা phantom {} থাকে,
  // তাই `all` দিয়ে নয়, লিফ ভ্যালু (success) দিয়ে চেক করা হয়। null মানে BD Courier ফেল করেছিল →
  // "ফেচ হয়নি" ধরা হয়, যাতে আবার চেষ্টা করা যায়।
  const isFetched = (doc) => doc.courierHistory?.all?.success != null;

  const cleanPhones = (doc) => (getPhones(doc) || []).filter(Boolean);

  // ফেচ → ওই মডেলেই সেভ → enrich → broadcast। আপডেটেড (enriched) ডকুমেন্ট ফেরত দেয়।
  async function fetchAndSave(doc, io, cache, phones) {
    const count = await fetchCourierHistorySummary(phones);

    const updated = await Model.findByIdAndUpdate(
      doc._id,
      {
        $set: {
          "courierHistory.all.success": count.success,
          "courierHistory.all.cancel": count.cancel,
          "courierHistory.providers": count.providers,
        },
      },
      { new: true },
    );

    const enriched = await enrich(updated, cache);
    if (io) emit(io, enriched);
    return enriched;
  }

  // --- POST .../:id/courier-history  { force?: boolean } ---
  async function single(req, res) {
    try {
      const doc = await Model.findById(req.params.id);
      if (!doc) return res.status(404).json({ message: msg.notFound });

      const cache = new Map();
      const force = req.body?.force === true;

      if (isFetched(doc) && !force) {
        return res.status(200).json({ success: true, [singleKey]: await enrich(doc, cache) });
      }

      const phones = cleanPhones(doc);
      if (phones.length === 0) return res.status(400).json({ message: msg.noPhone });

      const result = await fetchAndSave(doc, req.app.get("io"), cache, phones);
      return res.status(200).json({ success: true, [singleKey]: result });
    } catch (error) {
      console.error(`Get ${logName} courier history error:`, error);
      return res.status(500).json({ message: msg.failed });
    }
  }

  // --- POST .../courier-history-bulk  { <idsKey>: [...] } ---
  // একটা ডকুমেন্টে সমস্যা হলে (ফোন নেই ইত্যাদি) সেটা স্কিপ, বাকিগুলো চলবে।
  async function bulk(req, res) {
    try {
      const ids = req.body?.[idsKey];
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, message: msg.idsRequired });
      }

      const docs = await Model.find({ $and: [bulkScope(req), { _id: { $in: ids } }] });
      if (docs.length !== ids.length) {
        console.log(
          `⚠️ ${logName} courier-history-bulk: ${ids.length}টি চাওয়া হয়েছে, পাওয়া গেছে ${docs.length}টি`,
        );
      }
      if (docs.length === 0) {
        return res.status(404).json({ success: false, message: msg.noneFound });
      }

      const io = req.app.get("io");
      const cache = new Map();

      const results = await Promise.all(
        docs.map(async (doc) => {
          if (isFetched(doc)) return enrich(doc, cache);

          const phones = cleanPhones(doc);
          if (phones.length === 0) return enrich(doc, cache); // ফোন নেই — স্কিপ

          try {
            return await fetchAndSave(doc, io, cache, phones);
          } catch (err) {
            console.error(`Bulk courier history failed for ${logName} ${doc._id}:`, err.message);
            return enrich(doc, cache); // আনচেঞ্জড, বাকিগুলো চলবে
          }
        }),
      );

      return res.status(200).json({ success: true, [bulkKey]: results });
    } catch (error) {
      console.error(`Get bulk ${logName} courier history error:`, error);
      return res.status(500).json({ success: false, message: msg.bulkFailed });
    }
  }

  return { single, bulk };
}

module.exports = { createCourierHistoryHandlers };
