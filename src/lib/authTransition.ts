export const setAuthTransition = (message?: string) => {
  try {
    sessionStorage.setItem('auth:transition', '1');
    if (message) sessionStorage.setItem('auth:transitionMessage', message);
  } catch {}
  window.dispatchEvent(new Event('auth:transition'));
};

export const clearAuthTransition = () => {
  try {
    sessionStorage.removeItem('auth:transition');
    sessionStorage.removeItem('auth:transitionMessage');
  } catch {}
  window.dispatchEvent(new Event('auth:transition'));
};
