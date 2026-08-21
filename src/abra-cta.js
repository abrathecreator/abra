const FLASH_MS = 260;

/**
 * Briefly flips a non-submit .abra-cta into its loading state on click
 * (anchor scroll / mailto — real navigation, so this is cosmetic only).
 * Submit buttons manage their own data-state around the actual request.
 */
export function initAbraCta() {
  document.querySelectorAll(".abra-cta:not([type='submit'])").forEach((el) => {
    el.addEventListener("click", () => {
      el.dataset.state = "loading";
      setTimeout(() => {
        delete el.dataset.state;
      }, FLASH_MS);
    });
  });
}
