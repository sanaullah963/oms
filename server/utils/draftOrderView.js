// Draft UI-তে Pending-এ পাঠানোর জন্য যে landing-page/order configuration দরকার,
// সেটা এক জায়গায় সাজিয়ে দেওয়া হয়। মূল DraftOrder document-এ এগুলো duplicate করে রাখা হয় না।
function withLandingPageMeta(draft, page) {
  const data = typeof draft?.toObject === "function" ? draft.toObject() : { ...draft };
  if (!page) return data;

  return {
    ...data,
    landingPage: {
      _id: page._id,
      slug: page.slug,
      productName: page.productName,
      productCode: page.productCode,
      price: page.price,
      freeDelivery: page.freeDelivery !== false,
      deliveryChargeInsideDhaka: page.deliveryChargeInsideDhaka,
      deliveryChargeOutsideDhaka: page.deliveryChargeOutsideDhaka,
      productTypes: (page.productTypes || []).map((type) => ({
        _id: type._id,
        label: type.label,
        price: type.price,
        originalPrice: type.originalPrice,
        freeDelivery: type.freeDelivery !== false,
        deliveryChargeInsideDhaka: type.deliveryChargeInsideDhaka,
        deliveryChargeOutsideDhaka: type.deliveryChargeOutsideDhaka,
        isDefault: type.isDefault,
      })),
    },
  };
}

module.exports = { withLandingPageMeta };
