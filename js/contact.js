/* ============================================================
   EZ FINISH AUTO · contact page
   The booking form is a message composer: it validates, writes
   the booking request, copies it, and hands off to Instagram or
   the messages app. Nothing is sent or stored by the site.
   ============================================================ */

(() => {
  "use strict";

  const CFG = window.EZ_CONFIG || {};
  const $ = (s, c = document) => c.querySelector(s);

  /* ---------------- text-message method card ----------------
     Shown only once a real number is configured in js/config.js,
     so the page never advertises a channel that does not exist. */
  const smsHref = typeof CFG.smsHref === "function" ? CFG.smsHref() : "";
  const methodSms = $("#methodSms");
  if (smsHref && methodSms) {
    methodSms.href = smsHref;
    methodSms.hidden = false;
    const label = $("#methodSmsNumber");
    if (label && CFG.smsNumber) label.textContent = CFG.smsNumber;
  }

  /* ---------------- form ---------------- */
  const form = $("#qform");
  const done = $("#qdone");
  if (!form || !done) return;

  const fields = {
    name: { input: $("#q-name"), wrap: $("#fw-name") },
    vehicle: { input: $("#q-vehicle"), wrap: $("#fw-vehicle") },
  };

  function setError(f, on) {
    f.wrap.classList.toggle("has-err", on);
    f.input.setAttribute("aria-invalid", on ? "true" : "false");
  }

  ["input", "change"].forEach((ev) => {
    Object.values(fields).forEach((f) =>
      f.input.addEventListener(ev, () => setError(f, false)));
  });

  function composeMessage() {
    const name = $("#q-name").value.trim();
    const vehicle = $("#q-vehicle").value;
    const area = $("#q-area").value.trim();
    const when = $("#q-when").value.trim();
    const details = $("#q-details").value.trim();
    const lines = [
      `Hi EZ Finish Auto, I'd like to book mobile detailing.`,
      `Name: ${name}`,
      `Vehicle: ${vehicle}`,
    ];
    if (area) lines.push(`Area: ${area}`);
    if (when) lines.push(`Preferred day: ${when}`);
    if (details) lines.push(`Details: ${details}`);
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
    Object.values(fields).forEach((f) => {
      const bad = !f.input.value || !f.input.value.trim();
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
      ? "Copied to your clipboard. Open Instagram and paste it in our DMs."
      : "Select the message above to copy it, then paste it in our Instagram DMs.";

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
