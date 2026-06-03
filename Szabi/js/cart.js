(function () {
  var STORAGE_KEY = "csaba-kft-kosar";

  var kosar = [];
  var popup = document.getElementById("kosar-popup");
  var popupNev = document.getElementById("kosar-popup-nev");
  var popupAr = document.getElementById("kosar-popup-ar");
  var badge = document.getElementById("kosar-jelzo");
  var panel = document.getElementById("kosar-panel");
  var lista = document.getElementById("kosar-lista");
  var ures = document.getElementById("kosar-ures");
  var osszegEl = document.getElementById("kosar-osszeg");
  var rendelesGomb = document.getElementById("kosar-rendeles");
  var uritesGomb = document.getElementById("kosar-urites");
  var hirlevelForm = document.getElementById("hirlevel-form");
  var hirlevelPopup = document.getElementById("hirlevel-popup");
  var hirlevelSzoveg = document.getElementById("hirlevel-popup-szoveg");
  var rendelesPopup = document.getElementById("rendeles-popup");
  var rendelesAzon = document.getElementById("rendeles-azon");
  var rendelesOsszegPopup = document.getElementById("rendeles-osszeg-popup");
  var rendelesInfo = document.getElementById("rendeles-info");

  function formatAr(szam) {
    return (szam || 0).toLocaleString("hu-HU") + " Ft";
  }

  function betolt() {
    try {
      var mentett = localStorage.getItem(STORAGE_KEY);
      if (mentett) kosar = JSON.parse(mentett);
      if (!Array.isArray(kosar)) kosar = [];
    } catch (e) {
      kosar = [];
    }
    frissitMinden();
  }

  function ment() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(kosar));
    frissitMinden();
  }

  function osszesDb() {
    return kosar.reduce(function (s, t) {
      return s + (t.db || 1);
    }, 0);
  }

  function osszeg() {
    return kosar.reduce(function (s, t) {
      return s + (t.ar || 0) * (t.db || 1);
    }, 0);
  }

  function frissitJelzo() {
    if (!badge) return;
    var db = osszesDb();
    badge.textContent = String(db);
    badge.hidden = db === 0;
    badge.setAttribute("aria-label", db + " tétel a kosárban");
  }

  function frissitPanel() {
    if (!lista || !ures) return;

    lista.innerHTML = "";
    var uresAKosar = kosar.length === 0;
    ures.hidden = !uresAKosar;
    lista.hidden = uresAKosar;

    kosar.forEach(function (t) {
      var li = document.createElement("li");
      li.className = "kosar-tetel";
      li.dataset.id = t.id;

      var kepHtml = t.kep
        ? '<img src="' + t.kep + '" alt="" class="kosar-tetel-kep">'
        : '<span class="kosar-tetel-kep kosar-tetel-kep--ures"></span>';

      li.innerHTML =
        kepHtml +
        '<div class="kosar-tetel-info">' +
        '<p class="kosar-tetel-nev">' + escapeHtml(t.nev) + "</p>" +
        '<p class="kosar-tetel-ar">' + formatAr(t.ar) + "</p>" +
        "</div>" +
        '<div class="kosar-tetel-db">' +
        '<button type="button" class="kosar-db-gomb" data-db-muvelet="minus" aria-label="Kevesebb">−</button>' +
        '<span class="kosar-db-szam">' + (t.db || 1) + "</span>" +
        '<button type="button" class="kosar-db-gomb" data-db-muvelet="plus" aria-label="Több">+</button>' +
        "</div>" +
        '<button type="button" class="kosar-torol" data-torol aria-label="Eltávolítás">×</button>';

      lista.appendChild(li);
    });

    if (osszegEl) osszegEl.textContent = formatAr(osszeg());
    if (rendelesGomb) rendelesGomb.disabled = uresAKosar;
    if (uritesGomb) uritesGomb.disabled = uresAKosar;
  }

  function escapeHtml(szoveg) {
    var d = document.createElement("div");
    d.textContent = szoveg;
    return d.innerHTML;
  }

  function frissitMinden() {
    frissitJelzo();
    frissitPanel();
  }

  function bodyZar() {
    document.body.classList.remove("popup-nyitva", "kosar-panel-nyitva");
  }

  function vanNyitottPopup() {
    return (
      (popup && popup.classList.contains("aktiv")) ||
      (hirlevelPopup && hirlevelPopup.classList.contains("aktiv")) ||
      (rendelesPopup && rendelesPopup.classList.contains("aktiv"))
    );
  }

  function popupNyit(nev, ar) {
    if (!popup) return;
    if (popupNev) popupNev.textContent = nev;
    if (popupAr) popupAr.textContent = formatAr(ar);
    popup.hidden = false;
    popup.classList.add("aktiv");
    document.body.classList.add("popup-nyitva");
    var bezar = popup.querySelector(".kosar-popup-bezar");
    if (bezar) bezar.focus();
  }

  function popupZar() {
    if (!popup) return;
    popup.hidden = true;
    popup.classList.remove("aktiv");
    if ((!panel || panel.hidden) && !vanNyitottPopup()) bodyZar();
  }

  function hirlevelPopupNyit(nev) {
    if (!hirlevelPopup) return;
    if (hirlevelSzoveg && nev) {
      hirlevelSzoveg.textContent = "Köszönjük, " + nev + "! Hamarosan jelentkezünk.";
    }
    hirlevelPopup.hidden = false;
    hirlevelPopup.classList.add("aktiv");
    document.body.classList.add("popup-nyitva");
  }

  function hirlevelPopupZar() {
    if (!hirlevelPopup) return;
    hirlevelPopup.hidden = true;
    hirlevelPopup.classList.remove("aktiv");
    if ((!popup || popup.hidden) && !vanNyitottPopup()) bodyZar();
  }

  function rendelesAzonGeneral() {
    var datum = new Date();
    var honap = String(datum.getMonth() + 1).padStart(2, "0");
    var nap = String(datum.getDate()).padStart(2, "0");
    var veletlen = Math.floor(1000 + Math.random() * 9000);
    return "CK-" + datum.getFullYear() + honap + nap + "-" + veletlen;
  }

  function rendelesPopupNyit(db, total) {
    if (!rendelesPopup) return;
    panelZar();
    if (rendelesAzon) rendelesAzon.textContent = rendelesAzonGeneral();
    if (rendelesOsszegPopup) rendelesOsszegPopup.textContent = formatAr(total);
    if (rendelesInfo) {
      rendelesInfo.textContent = db + (db === 1 ? " tétel rendelve" : " tétel rendelve");
    }
    rendelesPopup.hidden = false;
    rendelesPopup.classList.add("aktiv");
    document.body.classList.add("popup-nyitva");
    var gomb = rendelesPopup.querySelector(".rendeles-popup-gomb");
    if (gomb) gomb.focus();
  }

  function rendelesPopupZar() {
    if (!rendelesPopup) return;
    rendelesPopup.hidden = true;
    rendelesPopup.classList.remove("aktiv");
    if (!vanNyitottPopup()) bodyZar();
  }

  function panelNyit() {
    if (!panel) return;
    popupZar();
    panel.hidden = false;
    panel.classList.add("aktiv");
    document.body.classList.add("kosar-panel-nyitva");
    frissitPanel();
    var bezar = panel.querySelector(".kosar-panel-bezar");
    if (bezar) bezar.focus();
  }

  function panelZar() {
    if (!panel) return;
    panel.hidden = true;
    panel.classList.remove("aktiv");
    bodyZar();
  }

  function hozzaad(termek) {
    var letezo = kosar.find(function (t) {
      return t.id === termek.id;
    });
    if (letezo) {
      letezo.db = (letezo.db || 1) + 1;
    } else {
      kosar.push({
        id: termek.id,
        nev: termek.nev,
        ar: termek.ar,
        kep: termek.kep,
        db: 1,
      });
    }
    ment();
    popupNyit(termek.nev, termek.ar);
  }

  function tetelDb(id, delta) {
    var t = kosar.find(function (x) {
      return x.id === id;
    });
    if (!t) return;
    t.db = (t.db || 1) + delta;
    if (t.db < 1) {
      kosar = kosar.filter(function (x) {
        return x.id !== id;
      });
    }
    ment();
  }

  function tetelTorol(id) {
    kosar = kosar.filter(function (x) {
      return x.id !== id;
    });
    ment();
  }

  function kosarUrit() {
    if (kosar.length === 0) return;
    if (confirm("Biztosan kiüríted a kosarat?")) {
      kosar = [];
      ment();
    }
  }

  document.querySelectorAll(".termek .gomb").forEach(function (gomb) {
    var article = gomb.closest(".termek");
    if (!article) return;

    var cim = article.querySelector("h2");
    var arElem = article.querySelector(".ar-sor");
    var kep = article.querySelector(".termek-kep img");
    var nev = cim ? cim.textContent.trim() : "Termék";
    var ar = 0;
    if (arElem) {
      ar = parseInt(arElem.textContent.replace(/[^\d]/g, ""), 10) || 0;
    }
    var id =
      "t-" +
      nev
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

    gomb.addEventListener("click", function () {
      hozzaad({ id: id, nev: nev, ar: ar, kep: kep ? kep.getAttribute("src") : "" });
    });
  });

  var ikon = document.getElementById("kosar-ikon");
  if (ikon) {
    ikon.addEventListener("click", panelNyit);
  }

  var megtekint = document.getElementById("kosar-popup-megtekint");
  if (megtekint) {
    megtekint.addEventListener("click", panelNyit);
  }

  if (lista) {
    lista.addEventListener("click", function (e) {
      var li = e.target.closest(".kosar-tetel");
      if (!li) return;
      var id = li.dataset.id;
      if (e.target.closest("[data-torol]")) {
        tetelTorol(id);
        return;
      }
      var muvelet = e.target.closest("[data-db-muvelet]");
      if (muvelet) {
        tetelDb(id, muvelet.dataset.dbMuvelet === "plus" ? 1 : -1);
      }
    });
  }

  if (uritesGomb) uritesGomb.addEventListener("click", kosarUrit);

  if (rendelesGomb) {
    rendelesGomb.addEventListener("click", function () {
      if (kosar.length === 0) return;
      var db = osszesDb();
      var total = osszeg();
      kosar = [];
      ment();
      rendelesPopupNyit(db, total);
    });
  }

  document.querySelectorAll("[data-panel-bezar]").forEach(function (el) {
    el.addEventListener("click", panelZar);
  });

  document.querySelectorAll("[data-popup-bezar]").forEach(function (el) {
    el.addEventListener("click", function () {
      popupZar();
      hirlevelPopupZar();
      rendelesPopupZar();
    });
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (panel && panel.classList.contains("aktiv")) panelZar();
    else if (rendelesPopup && rendelesPopup.classList.contains("aktiv")) rendelesPopupZar();
    else if (popup && popup.classList.contains("aktiv")) popupZar();
    else if (hirlevelPopup && hirlevelPopup.classList.contains("aktiv")) hirlevelPopupZar();
  });

  if (hirlevelForm) {
    hirlevelForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var nevInput = hirlevelForm.querySelector('[name="nev"]');
      var emailInput = hirlevelForm.querySelector('[name="email"]');
      var gdpr = hirlevelForm.querySelector('[name="gdpr"]');
      var nev = nevInput ? nevInput.value.trim() : "";
      var email = emailInput ? emailInput.value.trim() : "";

      if (!nev || !email) {
        alert("Kérjük, add meg a neved és az e-mail címed!");
        return;
      }
      if (!gdpr || !gdpr.checked) {
        alert("Az adatkezelési tájékoztató elfogadása kötelező.");
        return;
      }

      hirlevelForm.reset();
      hirlevelPopupNyit(nev);
    });
  }

  betolt();
})();
