/*
  common.js  -  small helpers shared by every page.
  Each page loads this file first, then its own file (login.js, products.js ...).
*/


/* ------------------------------------------------------------
   1. Names shown for categories
------------------------------------------------------------ */

const SHOP_CATEGORIES = {
  grocery: "Grocery",
  clothing: "Clothing",
  food: "Food & Beverages",
  electronics: "Electronics",
  stationery: "Stationery",
  other: "Other"
};

const PRODUCT_CATEGORIES = {
  grocery: "Grocery",
  dairy: "Dairy",
  bakery: "Bakery",
  beverages: "Beverages",
  snacks: "Snacks",
  other: "Other"
};


/* ------------------------------------------------------------
   2. Login token (remembers that the owner is logged in)
------------------------------------------------------------ */

const TOKEN_KEY = "dukaan_token";

function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
}

function saveToken(token) {
  try { localStorage.setItem(TOKEN_KEY, token); } catch (e) {}
}

function clearToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
}


/* ------------------------------------------------------------
   3. Talking to the server (server.js)
   Example:  api("/products").then(function (list) { ... })
------------------------------------------------------------ */

function api(path, options) {
  options = options || {};

  const headers = {};
  if (options.body) headers["Content-Type"] = "application/json";

  // Send the login token unless this is a public request
  const token = getToken();
  if (token && options.auth !== false) headers["Authorization"] = "Bearer " + token;

  return fetch("/api" + path, {
    method: options.method || "GET",
    headers: headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  }).then(
    function (response) {
      return response.json().catch(function () { return {}; }).then(function (data) {
        // Token expired or invalid: forget it
        if (response.status === 401 && token && options.auth !== false) clearToken();

        if (!response.ok) {
          const error = new Error(data.message || "Something went wrong.");
          error.status = response.status;
          throw error;
        }
        return data;
      });
    },
    function () {
      throw new Error("Cannot reach the server. Make sure it is running.");
    }
  );
}


/* ------------------------------------------------------------
   4. Login checks used by the owner pages
------------------------------------------------------------ */

// Use on owner pages (dashboard, products, qr).
// Sends the visitor to login.html if they are not logged in.
function startOwnerPage(onReady) {
  if (!getToken()) {
    window.location.href = "login.html";
    return;
  }

  api("/me")
    .then(function (me) {
      setupLogoutButton();

      const myShopLink = document.getElementById("myShopLink");
      if (myShopLink) myShopLink.href = "shop.html?id=" + me.shop.id;

      onReady(me);
    })
    .catch(function (error) {
      if (error.status === 401) {
        window.location.href = "login.html";
      } else {
        showToast(error.message, true);
      }
    });
}

// Use on login and register pages.
// If the owner is already logged in, skip straight to the dashboard.
function skipIfLoggedIn() {
  if (!getToken()) return;
  api("/me").then(function () {
    window.location.href = "dashboard.html";
  }).catch(function () {});
}

function setupLogoutButton() {
  const button = document.getElementById("logoutBtn");
  if (!button) return;

  button.onclick = function () {
    api("/logout", { method: "POST" }).catch(function () {});
    clearToken();
    window.location.href = "index.html";
  };
}


/* ------------------------------------------------------------
   5. Small helpers
------------------------------------------------------------ */

// Makes text safe to put inside HTML (stops people injecting code)
function esc(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

// 30 -> "₹30"
function rupees(amount) {
  return "\u20B9" + Number(amount).toLocaleString("en-IN");
}

// "Sharma General Store" -> "SG"
function initials(name) {
  const words = String(name).trim().split(/\s+/);
  const first = words[0][0] || "D";
  const second = words[1] ? words[1][0] : (words[0][1] || "");
  return (first + second).toUpperCase();
}

// Small message at the bottom of the screen
let toastTimer;
function showToast(message, isError) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.className = "toast show" + (isError ? " bad" : "");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { toast.className = "toast"; }, 3000);
}

// Red error message inside a form
function showFormError(box, message) {
  box.className = "msg err";
  box.textContent = message;
}

// Product picture, or a letter box if there is no photo
function productThumb(product) {
  if (product.image) {
    return '<img class="thumb" src="' + esc(product.image) + '" alt="' + esc(product.name) + '" loading="lazy">';
  }
  const letter = (product.name || "?").trim().charAt(0).toUpperCase();
  return '<div class="thumb ph" aria-hidden="true">' + esc(letter) + '</div>';
}
