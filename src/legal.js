import "./style.css";
import "./metrica.js";
import "./cookie-consent.js";
import { initContactModal } from "./contact-modal.js";
import { initNav } from "./nav.js";

/* initContactModal() — no-op на страницах без #contact-modal в разметке
   (privacy/terms/consent/404/cases/articles), реально нужен только
   case-zhbi.html. Общий entry, чтобы не заводить под один кейс отдельный
   файл. */
initContactModal();
initNav();
