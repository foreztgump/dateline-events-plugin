import noBarePromisesInHooks from "./rules/no-bare-promises-in-hooks.js";

const plugin = {
  rules: {
    "no-bare-promises-in-hooks": noBarePromisesInHooks,
  },
};

export default plugin;
