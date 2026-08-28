/* ============================================================
   EZ FINISH AUTO · site configuration
   One place for every contact path on the site. Both pages read
   from this file, so a value changed here changes everywhere.
   ============================================================ */

window.EZ_CONFIG = {
  /* The business phone number, in full international format. */
  smsNumber: "+16474244813",

  /* How the number reads on the page. */
  smsDisplay: "+1 647-424-4813",

  /* Prefilled first message for text-message links. */
  smsGreeting: "Hi EZ Finish Auto! I'd like to book a mobile detail.",

  /* Contact destinations. */
  instagram: "https://www.instagram.com/ezfinishauto",
  instagramDm: "https://ig.me/m/ezfinishauto",
  tiktok: "https://www.tiktok.com/@ez.finishauto",
  contactPage: "/contact",
};

/* Builds a text-message href for the configured number, or ""
   when no number is set. iOS separates the body with "&",
   everything else with "?". */
window.EZ_CONFIG.smsHref = function (body) {
  const clean = (this.smsNumber || "").replace(/[^\d+]/g, "");
  if (!/^\+?\d{10,15}$/.test(clean)) return "";
  const sep = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent) ? "&" : "?";
  return "sms:" + clean + sep + "body=" + encodeURIComponent(body || this.smsGreeting);
};
