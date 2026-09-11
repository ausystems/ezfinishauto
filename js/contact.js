/* ============================================================
   EZ FINISH AUTO · contact page
   The booking form sends by text: it validates, writes the
   booking request, and opens the visitor's messaging app with
   that request already addressed to the business number. The
   written request stays on screen with a button to reopen
   Messages, an Instagram alternative, and a copy fallback for
   desktops without a messaging app. Nothing is stored by the
   site.
   ============================================================ */

(() => {
  "use strict";

  const CFG = window.EZ_CONFIG || {};
  const $ = (s, c = document) => c.querySelector(s);

  const form = $("#qform");
  const done = $("#qdone");
  if (!form || !done) return;

  // every field is required except the message box
  const required = ["name", "phone", "email", "city", "vehicle", "model"].map((key) => ({
    key,
    input: $("#q-" + key),
    wrap: $("#fw-" + key),
  }));

  function setError(f, on) {
    f.wrap.classList.toggle("has-err", on);
    f.input.setAttribute("aria-invalid", on ? "true" : "false");
  }

  ["input", "change"].forEach((ev) => {
    required.forEach((f) =>
      f.input.addEventListener(ev, () => setError(f, false)));
  });

  function composeMessage() {
    const v = (id) => $("#q-" + id).value.trim();
    const lines = [
      "Hi EZ Finish Auto! I'd like to book a mobile detail.",
      `Name: ${v("name")}`,
      `Phone: ${v("phone")}`,
      `Email: ${v("email")}`,
      `Vehicle: ${$("#q-vehicle").value}`,
      `Make and model: ${v("model")}`,
      `City: ${v("city")}`,
    ];
    const message = v("message");
    if (message) lines.push(`Message: ${message}`);
    return lines.join("\n");
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        ta.remove();
        return ok;
      } catch (e2) { return false; }
    }
  }

  const note = $("#qdoneNote");
  const smsBtn = $("#qSms");
  // desktops rarely have a messaging app wired to sms: links, so they get
  // the request copied instead of a link that does nothing
  const handheld = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // honeypot: a filled hidden field means a bot, not a customer
    if ($("#q-company").value) return;

    let firstBad = null;
    required.forEach((f) => {
      let bad = !f.input.value || !f.input.value.trim();
      if (!bad && f.key === "email" && !f.input.validity.valid) bad = true;
      setError(f, bad);
      if (bad && !firstBad) firstBad = f.input;
    });
    if (firstBad) { firstBad.focus(); return; }

    const msg = composeMessage();
    $("#qdoneMsg").textContent = msg;

    const sms = typeof CFG.smsHref === "function" ? CFG.smsHref(msg) : "";
    if (sms) smsBtn.href = sms;

    form.hidden = true;
    done.hidden = false;

    if (sms && handheld) {
      // the actual send: hand the written request to the messaging app
      note.textContent = "Your messaging app is opening with the request addressed to us. Tap send there. If it did not open, use the button above.";
      window.location.href = sms;
    } else {
      const copied = await copyText(msg);
      note.textContent = copied
        ? "Copied to your clipboard. Text it to +1 647-424-4813 from your phone, or send it on Instagram."
        : "Select the message above to copy it, then text it to +1 647-424-4813 or send it on Instagram.";
    }

    $("#qdoneTitle").focus();
  });

  $("#qCopy").addEventListener("click", async () => {
    const ok = await copyText($("#qdoneMsg").textContent);
    note.textContent = ok
      ? "Copied to your clipboard."
      : "Copy is blocked in this browser, so select the message above instead.";
  });

  $("#qEdit").addEventListener("click", () => {
    done.hidden = true;
    form.hidden = false;
    $("#q-name").focus();
  });
})();
