let showToastFunction = null;

export const registerToast = (fn) => {
  showToastFunction = fn;
};

export const showToast = (message = "Copyed") => {
  if (showToastFunction) {
    showToastFunction(message);
  }
};
