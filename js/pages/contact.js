import { toast } from "../ui.js";

export function initContactPage() {
  const form = document.getElementById("contact-form");
  const status = document.getElementById("contact-status");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    if (!form.checkValidity()) {
      status.textContent = "Проверьте поля формы — есть ошибки.";
      toast("Исправьте ошибки в форме");
      return;
    }

    const fd = new FormData(form);
    const payload = {
      name: fd.get("name"),
      email: fd.get("email"),
      message: fd.get("message")
    };

    // без бэкенда — просто “успешно”
    console.log("Contact payload:", payload);
    status.textContent = "Спасибо! Сообщение принято (демо-режим).";
    toast("Сообщение отправлено (демо)");
    form.reset();
  });
}
