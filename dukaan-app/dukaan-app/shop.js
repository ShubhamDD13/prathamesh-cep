/*
  shop.js  -  runs on shop.html (the page customers see)
  The shop id comes from the address:  shop.html?id=abc123
*/

const shopId = new URLSearchParams(window.location.search).get("id");

const shopNameEl = document.getElementById("shopName");
const shopInfoEl = document.getElementById("shopInfo");
const callBtn = document.getElementById("callBtn");
const chipsEl = document.getElementById("chips");
const listEl = document.getElementById("productList");

if (!shopId) {
  showNotFound("This link is missing a shop. Ask the shop owner for a new QR code.");
} else {
  api("/shop/" + encodeURIComponent(shopId), { auth: false })
    .then(function (data) {
      showShop(data.shop, data.products);
    })
    .catch(function (error) {
      showNotFound(error.message);
    });
}


/* ---------- Shop not found ---------- */

function showNotFound(message) {
  shopNameEl.textContent = "We could not find that shop";
  shopInfoEl.textContent = message;
}


/* ---------- Show the shop ---------- */

function showShop(shop, products) {
  document.title = shop.name + " | Dukaan";

  // Header
  shopNameEl.textContent = shop.name;
  shopInfoEl.textContent = (SHOP_CATEGORIES[shop.category] || shop.category) + " \u00B7 " + shop.location;

  if (shop.phone) {
    callBtn.href = "tel:" + shop.phone;
    callBtn.hidden = false;
  }

  // Nothing added yet
  if (products.length === 0) {
    listEl.innerHTML =
      '<div class="empty"><h2 class="sub">No products listed yet</h2><p>Please check back soon.</p></div>';
    return;
  }

  showCategoryButtons(products);
  showProducts(products);
  setupPhotoZoom();
}


/* ---------- Category buttons (All, Dairy, Bakery ...) ---------- */

function showCategoryButtons(products) {
  // Work out which categories this shop actually has
  const categories = [];
  products.forEach(function (p) {
    if (categories.indexOf(p.category) === -1) categories.push(p.category);
  });

  // Only show buttons if there is more than one category
  if (categories.length < 2) return;

  let html = '<button class="chip" data-category="" aria-pressed="true" type="button">All</button>';
  categories.forEach(function (c) {
    html += '<button class="chip" data-category="' + esc(c) + '" aria-pressed="false" type="button">' +
            esc(PRODUCT_CATEGORIES[c] || c) + '</button>';
  });
  chipsEl.innerHTML = html;

  // When a button is pressed, show only that category
  chipsEl.addEventListener("click", function (event) {
    const chip = event.target.closest(".chip");
    if (!chip) return;

    const chosen = chip.getAttribute("data-category");

    chipsEl.querySelectorAll(".chip").forEach(function (c) {
      c.setAttribute("aria-pressed", c === chip ? "true" : "false");
    });

    listEl.querySelectorAll(".crow").forEach(function (row) {
      const matches = !chosen || row.getAttribute("data-category") === chosen;
      row.style.display = matches ? "" : "none";
    });
  });
}


/* ---------- Product rows ---------- */

function showProducts(products) {
  let html = "";

  products.forEach(function (p) {
    const categoryName = PRODUCT_CATEGORIES[p.category] || p.category;
    const extra = p.description ? " \u00B7 " + esc(p.description) : "";
    const gone = p.available ? "" : " gone";
    const stockNote = p.available ? "" : '<span class="out">Out of stock</span>';

    html +=
      '<div class="crow' + gone + '" data-category="' + esc(p.category) + '">' +
        productThumb(p) +
        '<div class="grow">' +
          '<h3>' + esc(p.name) + '</h3>' +
          '<p>' + esc(categoryName) + extra + '</p>' +
        '</div>' +
        '<div>' +
          '<div class="price">' + rupees(p.price) + '</div>' +
          stockNote +
        '</div>' +
      '</div>';
  });

  listEl.innerHTML = html;
}


/* ---------- Tap a photo to see it bigger ---------- */

function setupPhotoZoom() {
  listEl.addEventListener("click", function (event) {
    const photo = event.target.closest("img.thumb");
    if (!photo) return;

    const overlay = document.createElement("div");
    overlay.className = "lightbox";
    overlay.innerHTML = '<img alt="' + esc(photo.alt) + '" src="' + esc(photo.getAttribute("src")) + '">';

    function close() {
      overlay.remove();
      document.removeEventListener("keydown", onKey);
    }
    function onKey(e) { if (e.key === "Escape") close(); }

    overlay.addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    document.body.appendChild(overlay);
  });
}
