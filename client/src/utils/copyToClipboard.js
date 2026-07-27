import { showToast } from "@/lib/toast";

export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);

    showToast("Copied");

    return true;
  } catch (err) {
    console.error(err);

    showToast("কপি করা যায়নি");

    return false;
  }
};
