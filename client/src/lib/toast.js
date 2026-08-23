let showToastFunction = null;

export const registerToast = (fn) => {
  showToastFunction = fn;
};

export const showToast = (message = "Copyed", { position = "bottom" } = {}) => {
  if (showToastFunction) {
    showToastFunction(message, position);
  }
};