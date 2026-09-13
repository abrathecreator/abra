const STORAGE_KEY = "abra-cookie-consent";

function hasConsent() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

function rememberConsent() {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // localStorage недоступен (приватный режим и т.п.) — баннер просто
    // покажется снова при следующем визите, страница не должна из-за этого падать
  }
}

function initCookieBanner() {
  const banner = document.getElementById("cookie-banner");
  const acceptBtn = banner?.querySelector(".cookie-banner__accept");
  if (!banner || !acceptBtn || hasConsent()) return;

  banner.hidden = false;

  acceptBtn.addEventListener("click", () => {
    rememberConsent();
    banner.classList.add("is-dismissed");
  });
}

initCookieBanner();
