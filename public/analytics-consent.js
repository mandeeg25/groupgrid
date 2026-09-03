/* GroupGrid analytics consent loader.
   Loads Google Analytics (G-B9FWR9LYXX) and the LinkedIn Insight Tag (9901908)
   only after the visitor accepts. Vercel Web Analytics is cookieless and runs
   separately, regardless of this choice. */
(function () {
  var GA_ID = "G-B9FWR9LYXX";
  var LI_ID = "9901908"; // LinkedIn Insight Tag partner id
  var KEY = "gg_analytics_consent";

  function loadGA() {
    if (window.__ggGALoaded) return;
    window.__ggGALoaded = true;
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", GA_ID);
  }

  function loadLI() {
    if (window.__ggLILoaded) return;
    window.__ggLILoaded = true;
    window._linkedin_partner_id = LI_ID;
    window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
    window._linkedin_data_partner_ids.push(LI_ID);
    (function (l) {
      if (!l) { window.lintrk = function (a, b) { window.lintrk.q.push([a, b]); }; window.lintrk.q = []; }
      var s = document.getElementsByTagName("script")[0];
      var b = document.createElement("script");
      b.type = "text/javascript"; b.async = true;
      b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
      s.parentNode.insertBefore(b, s);
    })(window.lintrk);
  }

  function loadAll() { loadGA(); loadLI(); }

  function read() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function save(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  var choice = read();
  if (choice === "granted") { loadAll(); return; }
  if (choice === "denied") { return; }

  function build() {
    if (document.getElementById("gg-consent")) return;
    var css = document.createElement("style");
    css.textContent =
      "#gg-consent{position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483000;max-width:520px;margin:0 auto;" +
      "background:#0C1E3F;color:#fff;border-radius:14px;padding:16px 18px;" +
      "box-shadow:0 18px 50px -18px rgba(0,0,0,.55);font-family:'IBM Plex Sans',system-ui,-apple-system,sans-serif;" +
      "display:flex;flex-wrap:wrap;align-items:center;gap:12px 14px;line-height:1.5;animation:ggcup .3s ease both;}" +
      "@keyframes ggcup{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:none;}}" +
      "#gg-consent p{margin:0;font-size:13.5px;color:rgba(255,255,255,.86);flex:1 1 240px;}" +
      "#gg-consent a{color:#00C9B1;text-decoration:underline;}" +
      "#gg-consent .btns{display:flex;gap:8px;margin-left:auto;}" +
      "#gg-consent button{font:inherit;font-weight:700;font-size:13.5px;cursor:pointer;border-radius:9px;padding:9px 16px;border:1px solid transparent;}" +
      "#gg-consent .yes{background:#00C9B1;color:#06231f;}#gg-consent .yes:hover{background:#1CD9C1;}" +
      "#gg-consent .no{background:transparent;color:rgba(255,255,255,.8);border-color:rgba(255,255,255,.28);}" +
      "#gg-consent .no:hover{color:#fff;border-color:rgba(255,255,255,.6);}" +
      "@media(max-width:480px){#gg-consent .btns{width:100%;}#gg-consent button{flex:1;}}";
    document.head.appendChild(css);

    var bar = document.createElement("div");
    bar.id = "gg-consent";
    bar.setAttribute("role", "dialog");
    bar.setAttribute("aria-label", "Analytics consent");
    bar.innerHTML =
      "<p>We use analytics cookies to understand site traffic and improve GroupGrid. " +
      "See our <a href='https://groupgrid.io/'>privacy approach</a>.</p>" +
      "<div class='btns'><button class='no' type='button'>Decline</button>" +
      "<button class='yes' type='button'>Accept</button></div>";
    document.body.appendChild(bar);

    bar.querySelector(".yes").addEventListener("click", function () {
      save("granted"); loadAll(); bar.remove();
    });
    bar.querySelector(".no").addEventListener("click", function () {
      save("denied"); bar.remove();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
})();
