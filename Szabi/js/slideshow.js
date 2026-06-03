(function () {
  var slider = document.querySelector(".akcio-slider");
  if (!slider) return;

  var slides = slider.querySelectorAll(".akcio-slide");
  var dots = slider.querySelectorAll(".akcio-pont");
  var elozo = slider.querySelector(".akcio-nyil--bal");
  var kovetkezo = slider.querySelector(".akcio-nyil--jobb");
  var index = 0;
  var idozito;
  var kesleltetes = 4500;

  function mutat(i) {
    index = (i + slides.length) % slides.length;
    slides.forEach(function (slide, n) {
      slide.classList.toggle("aktiv", n === index);
    });
    dots.forEach(function (pont, n) {
      pont.classList.toggle("aktiv", n === index);
      pont.setAttribute("aria-selected", n === index ? "true" : "false");
    });
  }

  function kovetkezoSlide() {
    mutat(index + 1);
  }

  function indit() {
    megallit();
    idozito = setInterval(kovetkezoSlide, kesleltetes);
  }

  function megallit() {
    if (idozito) clearInterval(idozito);
  }

  if (elozo) {
    elozo.addEventListener("click", function () {
      mutat(index - 1);
      indit();
    });
  }

  if (kovetkezo) {
    kovetkezo.addEventListener("click", function () {
      kovetkezoSlide();
      indit();
    });
  }

  dots.forEach(function (pont, n) {
    pont.addEventListener("click", function () {
      mutat(n);
      indit();
    });
  });

  slider.addEventListener("mouseenter", megallit);
  slider.addEventListener("mouseleave", indit);

  mutat(0);
  indit();
})();
