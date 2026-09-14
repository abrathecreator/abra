/* CONTACT MODAL — форма заявки поверх страницы, открывается кнопкой
   [data-modal-open="contact-modal"]. Общий модуль для main.js (главная) и
   article.js (growth-system и другие статьи) — сама разметка #contact-modal
   с формой должна быть продублирована в каждой странице, где используется
   (см. growth-system.html), а вот логика открытия/закрытия и отправки —
   одна на всех, чтобы не разъезжалась при правках. */
const pageLoadedAt = Date.now();
const reducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

function getYandexClientId(timeoutMs = 1500) {
  return new Promise((resolve) => {
    if (typeof window.ym !== "function") {
      resolve(null);
      return;
    }
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(null);
      }
    }, timeoutMs);
    try {
      window.ym(111833820, "getClientID", (clientId) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(clientId || null);
        }
      });
    } catch {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(null);
      }
    }
  });
}

function getUtmParams() {
  const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  const params = new URLSearchParams(location.search);
  const utm = {};
  for (const key of keys) {
    const value = params.get(key);
    if (value) utm[key] = value;
  }
  return utm;
}

export function initContactModal() {
  const contactModal = document.getElementById("contact-modal");
  if (!contactModal) return;

  const modalDialog = contactModal.querySelector(".modal__dialog");
  const modalContactForm = document.getElementById("contact-form");
  const modalSuccessEl = document.getElementById("contact-success");
  let modalOpener = null;
  let modalCloseTimer = null;

  const getFocusable = () =>
    Array.from(
      modalDialog.querySelectorAll(
        "a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]"
      )
    ).filter((el) => el.tabIndex >= 0 && el.offsetParent !== null);

  const openModal = (opener) => {
    modalOpener = opener || null;
    clearTimeout(modalCloseTimer);
    contactModal.hidden = false;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => contactModal.classList.add("is-open"));
    /* Фокус на сам диалог (tabindex="-1"), не сразу в поле «Имя» — иначе
       на телефоне мгновенно выезжает клавиатура, а скринридер не
       успевает прочитать заголовок aria-labelledby. Первый Tab всё
       равно приведёт в поле имени. */
    modalDialog.focus();
  };

  const closeModal = () => {
    contactModal.classList.remove("is-open");
    document.body.style.overflow = "";

    // Форму уже отправляли в этом открытии — при повторном открытии нужно
    // показать чистую форму, а не застрявший экран благодарности.
    if (modalContactForm && modalSuccessEl && !modalSuccessEl.hidden) {
      modalContactForm.reset();
      modalContactForm.hidden = false;
      modalSuccessEl.hidden = true;
    }

    const finish = () => {
      contactModal.hidden = true;
      if (modalOpener) modalOpener.focus();
    };
    if (reducedMotion) {
      finish();
    } else {
      modalCloseTimer = setTimeout(finish, 220);
    }
  };

  document.querySelectorAll("[data-modal-open]").forEach((btn) => {
    btn.addEventListener("click", () => openModal(btn));
  });

  contactModal.querySelectorAll("[data-modal-close]").forEach((el) => {
    el.addEventListener("click", () => closeModal());
  });

  document.addEventListener("keydown", (e) => {
    if (contactModal.hidden) return;
    if (e.key === "Escape") {
      closeModal();
      return;
    }
    if (e.key === "Tab") {
      const focusable = getFocusable();
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  /* CONTACT FORM SUBMIT */
  const contactForm = modalContactForm;
  if (contactForm) {
    const successEl = modalSuccessEl;
    const errorEl = document.getElementById("contact-error");
    const submitBtn = document.getElementById("contact-submit");

    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (errorEl) {
        errorEl.hidden = true;
        errorEl.textContent = "";
      }

      // Explicit guard: consent must be checked even if browser validation is bypassed.
      const consentEl = document.getElementById("cf-consent");
      if (consentEl && !consentEl.checked) {
        if (errorEl) {
          errorEl.textContent =
            "Отметьте согласие на обработку персональных данных.";
          errorEl.hidden = false;
        }
        consentEl.focus();
        return;
      }

      const action = contactForm.getAttribute("action") || "";

      contactForm.classList.add("is-submitting");
      if (submitBtn) submitBtn.dataset.state = "loading";
      try {
        const formData = new FormData(contactForm);
        const ymClientId = await getYandexClientId();
        if (ymClientId) formData.append("ym_client_id", ymClientId);
        formData.append(
          "time_on_site_seconds",
          String(Math.round((Date.now() - pageLoadedAt) / 1000)),
        );
        for (const [key, value] of Object.entries(getUtmParams())) {
          formData.append(key, value);
        }

        const res = await fetch(action, {
          method: "POST",
          body: formData,
          headers: { Accept: "application/json" },
        });

        if (res.ok) {
          contactForm.hidden = true;
          if (successEl) {
            successEl.hidden = false;
            // Фокус на блок успеха — иначе скринридер не сообщит об отправке,
            // а фокус останется на кнопке внутри уже скрытой формы.
            successEl.focus();
            successEl.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        } else {
          const data = await res.json().catch(() => ({}));
          // errors[] — разбор по полям, его человеку показать полезно.
          // error (строка) — отказ на уровне сервера, посетителю бессмысленный:
          // пишем в консоль, на экран — общее сообщение.
          const fieldErrors =
            Array.isArray(data.errors) &&
            data.errors.map((x) => x.message).filter(Boolean).join(", ");
          console.error(
            "contact.php отклонил отправку:",
            res.status,
            data.error || fieldErrors || "(тело ответа не разобралось)",
          );
          if (errorEl) {
            errorEl.textContent =
              fieldErrors ||
              "Не удалось отправить. Попробуйте ещё раз или напишите на почту.";
            errorEl.hidden = false;
          }
        }
      } catch (err) {
        console.error("Отправка формы не дошла до сервера:", err);
        if (errorEl) {
          errorEl.textContent =
            "Сеть недоступна. Попробуйте ещё раз или напишите на почту.";
          errorEl.hidden = false;
        }
      } finally {
        contactForm.classList.remove("is-submitting");
        if (submitBtn) delete submitBtn.dataset.state;
      }
    });
  }
}
