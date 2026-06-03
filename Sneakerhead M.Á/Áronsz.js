(function () {
  const STORAGE_KEY = "csaba-kft-cart";

  const cartToggle = document.getElementById("cart-toggle");
  const cartPanel = document.getElementById("cart-panel");
  const cartOverlay = document.getElementById("cart-overlay");
  const cartClose = document.getElementById("cart-close");
  const cartItemsEl = document.getElementById("cart-items");
  const cartEmptyEl = document.getElementById("cart-empty");
  const cartFooterEl = document.getElementById("cart-footer");
  const cartTotalEl = document.getElementById("cart-total");
  const cartCountEl = document.getElementById("cart-count");
  const cartClearBtn = document.getElementById("cart-clear");
  const cartCheckoutBtn = document.querySelector(".cart-checkout");
  const toast = document.getElementById("toast");
  let toastTimer;

  function slugify(name) {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function formatPrice(amount) {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " Ft";
  }

  function getCart() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }

  function getItemCount(cart) {
    return cart.reduce((sum, item) => sum + item.qty, 0);
  }

  function getTotal(cart) {
    return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  }

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
  }

  function updateBadge() {
    const count = getItemCount(getCart());
    if (cartCountEl) {
      cartCountEl.textContent = count;
      cartCountEl.hidden = count === 0;
    }
  }

  function renderCart() {
    const cart = getCart();
    updateBadge();

    if (!cartItemsEl) return;

    cartItemsEl.innerHTML = "";

    if (cart.length === 0) {
      cartEmptyEl.hidden = false;
      cartFooterEl.hidden = true;
      return;
    }

    cartEmptyEl.hidden = true;
    cartFooterEl.hidden = false;
    cartTotalEl.textContent = formatPrice(getTotal(cart));

    cart.forEach((item) => {
      const li = document.createElement("li");
      li.className = "cart-item";
      li.dataset.id = item.id;

      const thumb = item.image
        ? `<img src="${item.image}" alt="" class="cart-item-img">`
        : `<div class="cart-item-img cart-item-img--empty" aria-hidden="true"></div>`;

      li.innerHTML = `
        ${thumb}
        <div class="cart-item-info">
          <p class="cart-item-name">${escapeHtml(item.name)}</p>
          <p class="cart-item-price">${formatPrice(item.price)}</p>
          <div class="cart-item-qty">
            <button type="button" class="qty-btn" data-action="minus" aria-label="Kevesebb">−</button>
            <span class="qty-value">${item.qty}</span>
            <button type="button" class="qty-btn" data-action="plus" aria-label="Több">+</button>
          </div>
        </div>
        <button type="button" class="cart-item-remove" aria-label="Eltávolítás">×</button>
      `;

      li.querySelector('[data-action="minus"]').addEventListener("click", () => {
        changeQty(item.id, -1);
      });
      li.querySelector('[data-action="plus"]').addEventListener("click", () => {
        changeQty(item.id, 1);
      });
      li.querySelector(".cart-item-remove").addEventListener("click", () => {
        removeItem(item.id);
      });

      cartItemsEl.appendChild(li);
    });
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function addItem({ id, name, price, image }) {
    const cart = getCart();
    const existing = cart.find((item) => item.id === id);

    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({ id, name, price, image: image || "", qty: 1 });
    }

    saveCart(cart);
    renderCart();
    showToast(name + " hozzáadva a kosárhoz!");
  }

  function changeQty(id, delta) {
    let cart = getCart();
    const item = cart.find((i) => i.id === id);
    if (!item) return;

    item.qty += delta;
    if (item.qty <= 0) {
      cart = cart.filter((i) => i.id !== id);
    }
    saveCart(cart);
    renderCart();
  }

  function removeItem(id) {
    const cart = getCart().filter((i) => i.id !== id);
    saveCart(cart);
    renderCart();
    showToast("Termék eltávolítva a kosárból.");
  }

  function clearCart() {
    saveCart([]);
    renderCart();
    showToast("A kosár kiürítve.");
  }

  function openCart() {
    cartPanel.classList.add("open");
    cartOverlay.classList.add("open");
    cartPanel.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeCart() {
    cartPanel.classList.remove("open");
    cartOverlay.classList.remove("open");
    cartPanel.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  document.querySelectorAll(".btn-add-cart").forEach((btn) => {
    btn.addEventListener("click", () => {
      const name = btn.getAttribute("data-product");
      const price = parseInt(btn.getAttribute("data-price"), 10);
      const image = btn.getAttribute("data-image") || "";
      const card = btn.closest(".product-card");
      const imgEl = card && card.querySelector(".product-image img");

      addItem({
        id: slugify(name),
        name,
        price,
        image: image || (imgEl ? imgEl.getAttribute("src") : ""),
      });
    });
  });

  cartToggle.addEventListener("click", openCart);
  cartClose.addEventListener("click", closeCart);
  cartOverlay.addEventListener("click", closeCart);
  cartClearBtn.addEventListener("click", () => {
    if (getCart().length && confirm("Biztosan kiüríted a kosarat?")) {
      clearCart();
    }
  });

  if (cartCheckoutBtn) {
    cartCheckoutBtn.addEventListener("click", () => {
      const cart = getCart();
      if (!cart.length) {
        showToast("A kosár üres — előbb válassz terméket!");
        return;
      }
      showToast("Köszönjük! A rendelés (összesen " + formatPrice(getTotal(cart)) + ") rögzítve — hamarosan felvesszük veled a kapcsolatot.");
      clearCart();
      closeCart();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeCart();
  });

  renderCart();
})();
