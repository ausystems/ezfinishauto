/* ============================================================
   EZ FINISH AUTO · contact page
   The booking form is a message composer: it validates, writes
   the booking request, copies it, and hands off to a text to
   the business number or an Instagram DM. Nothing is sent or
   stored by the site.
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
  const email = required.find((f) => f.key === "email");

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
      CFG.smsGreeting || "Hi EZ Finish Auto! I'd like to book a mobile detail.",
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
    const smsBtn = $("#qSms");
    if (sms) { smsBtn.href = sms; smsBtn.hidden = false; }

    form.hidden = true;
    done.hidden = false;

    const copied = await copyText(msg);
    note.textContent = copied
      ? "Copied to your clipboard. Send it as a text, or paste it in our Instagram DMs."
      : "Select the message above to copy it, then send it as a text or an Instagram DM.";

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
