// ============================================================================
// আর্থিক তথ্য (টাকার সংখ্যা) শুধু এডমিনের জন্য — মডারেটরের রেসপন্স থেকে সরানোর হেল্পার
// ============================================================================
// ব্যবহার: dashboardController / trackingParcelController-এ রেসপন্স পাঠানোর ঠিক আগে
//   if (!isAdminReq(req)) { ...মডারেটরের জন্য আর্থিক ফিল্ড বাদ দিয়ে পাঠাও... }
// ============================================================================

function isAdminReq(req) {
  return req.user?.role === "admin";
}

// অর্ডার ডকুমেন্ট থেকে totalCOD ও courier-এর আর্থিক ফিল্ড (deliveredCodAmount / deliveryCharge /
// codChargeAmount / responseData) সরিয়ে প্লেইন অবজেক্ট ফেরত দেয়
function stripOrderMoney(orderDoc) {
  const o = typeof orderDoc.toObject === "function" ? orderDoc.toObject() : { ...orderDoc };
  delete o.totalCOD;
  if (o.courier) {
    // eslint-disable-next-line no-unused-vars
    const { deliveredCodAmount, deliveryCharge, codChargeAmount, responseData, ...safeCourier } =
      o.courier;
    o.courier = safeCourier;
  }
  return o;
}

module.exports = { isAdminReq, stripOrderMoney };
