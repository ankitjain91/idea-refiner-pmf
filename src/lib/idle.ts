type IdleCallback = () => void;

export const scheduleIdle = (cb: IdleCallback, timeout = 1200) => {
  if (typeof (window as any).requestIdleCallback === 'function') {
    (window as any).requestIdleCallback(cb, { timeout });
  } else {
    setTimeout(cb, Math.min(timeout, 500));
  }
};

export const scheduleMicrotask = (cb: IdleCallback) => queueMicrotask(cb);
