/* eslint-disable */
// @ts-nocheck

module.exports = new Proxy(
  {},
  {
    get: (target, prop) => {
      if (prop in target) {
        return target[prop];
      }

      console.warn(`Attempted to call fs-extra.${String(prop)}, which is not supported in the browser.`);
      return () => {
        throw new Error(`fs-extra.${String(prop)} is not supported in the browser.`);
      };
    },
  },
);
