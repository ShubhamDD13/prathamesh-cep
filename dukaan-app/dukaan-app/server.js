"use strict";
/*
  Dukaan server. No npm packages needed, just Node 18 or newer.
  Run:  node server.js     then open  http://localhost:3000
  Data is saved in data.json, product photos in the uploads/ folder.
*/
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const os = require("os");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
// Only these files can be opened from the browser. server.js and data.json stay private.
const SITE_FILES = [
  "index.html", "login.html", "register.html", "dashboard.html", "products.html", "qr.html", "shop.html",
  "style.css", "common.js", "index.js", "login.js", "register.js", "dashboard.js", "products.js", "qr.js", "shop.js",
  "qrcode.min.js"
];
const UPLOADS = path.join(ROOT, "uploads");
const DATA_FILE = path.join(ROOT, "data.json");

fs.mkdirSync(UPLOADS, { recursive: true });

/* ---------- tiny JSON database ---------- */
let db = { vendors: [], shops: [], products: [], sessions: {} };
try {
  const stored = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  if (!stored || typeof stored !== "object" || Array.isArray(stored) ||
      !Array.isArray(stored.vendors) || !Array.isArray(stored.shops) ||
      !Array.isArray(stored.products) || !stored.sessions ||
      typeof stored.sessions !== "object" || Array.isArray(stored.sessions)) {
    throw new Error("Invalid data.json structure.");
  }
  db = Object.assign(db, stored);
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}

function save() {
  const tmp = DATA_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

const uid = () => crypto.randomBytes(8).toString("hex");
const httpErr = (status, message) => Object.assign(new Error(message), { status });

/* ---------- passwords ---------- */
function hashPw(pw) {
  const salt = crypto.randomBytes(16).toString("hex");
  return salt + ":" + crypto.scryptSync(pw, salt, 32).toString("hex");
}
function checkPw(pw, stored) {
  const [salt, hash] = String(stored).split(":");
  const a = Buffer.from(hash || "", "hex");
  const b = crypto.scryptSync(pw, salt || "", 32);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* ---------- validation ---------- */
const SHOP_CATEGORIES = ["grocery", "clothing", "food", "electronics", "stationery", "other"];
const PRODUCT_CATEGORIES = ["grocery", "dairy", "bakery", "beverages", "snacks", "other"];

function text(v, label, max, required) {
  const s = String(v == null ? "" : v).trim();
  if (required && !s) throw httpErr(400, label + " is required.");
  if (s.length > max) throw httpErr(400, label + " is too long.");
  return s;
}

function cleanProduct(b) {
  const price = Number(b.price);
  if (!Number.isFinite(price) || price < 0 || price > 10000000) throw httpErr(400, "Enter a valid price.");
  if (!PRODUCT_CATEGORIES.includes(b.category)) throw httpErr(400, "Choose a category.");
  return {
    name: text(b.name, "Product name", 80, true),
    price: Math.round(price * 100) / 100,
    category: b.category,
    description: text(b.description, "Description", 120, false),
    available: b.available !== false
  };
}

/* ---------- photos ---------- */
function saveImage(dataUrl) {
  const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ""));
  if (!m) throw httpErr(400, "Photo must be a JPEG, PNG or WebP image.");
  const buf = Buffer.from(m[2], "base64");
  if (buf.length > 2 * 1024 * 1024) throw httpErr(413, "That photo is too large.");
  const name = uid() + "." + (m[1] === "jpeg" ? "jpg" : m[1]);
  fs.writeFileSync(path.join(UPLOADS, name), buf);
  return "/uploads/" + name;
}
function removeImage(url) {
  if (!url) return;
  fs.unlink(path.join(UPLOADS, path.basename(url)), () => {});
}

/* ---------- http helpers ---------- */
function send(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0, tooBig = false;
    req.on("data", (c) => {
      size += c.length;
      if (size > 3 * 1024 * 1024) { tooBig = true; return; }
      chunks.push(c);
    });
    req.on("end", () => {
      if (tooBig) return reject(httpErr(413, "Request is too large."));
      try {
        const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
        if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid request.");
        resolve(body);
      }
      catch (e) { reject(httpErr(400, "Invalid request.")); }
    });
    req.on("error", reject);
  });
}

function authVendor(req) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  const vid = token && db.sessions[token];
  return vid ? db.vendors.find((v) => v.id === vid) || null : null;
}
function requireVendor(req) {
  const v = authVendor(req);
  if (!v) throw httpErr(401, "Please log in again.");
  return v;
}
function shopOf(vendor) { return db.shops.find((s) => s.vendorId === vendor.id); }
function publicShop(s) { return { id: s.id, name: s.name, location: s.location, category: s.category, phone: s.phone }; }
function meOf(v) { return { owner: v.name, phone: v.phone, shop: publicShop(shopOf(v)) }; }
function newSession(v) {
  const token = crypto.randomBytes(24).toString("hex");
  db.sessions[token] = v.id;
  return token;
}

function lanUrls() {
  const out = [];
  const nets = os.networkInterfaces();
  Object.keys(nets).forEach((n) => (nets[n] || []).forEach((i) => {
    if (i.family === "IPv4" && !i.internal) out.push("http://" + i.address + ":" + PORT);
  }));
  return out;
}

/* ---------- API ---------- */
async function handleApi(req, res, url) {
  const m = req.method, p = url.pathname;
  let match;

  if (m === "GET" && p === "/api/lan") return send(res, 200, { urls: lanUrls() });

  if (m === "POST" && p === "/api/register") {
    const b = await readBody(req);
    const owner = text(b.owner, "Owner name", 60, true);
    const shopName = text(b.shopName, "Shop name", 80, true);
    const location = text(b.location, "Location", 120, true);
    const phone = String(b.phone || "").trim();
    const password = String(b.password || "");
    if (!SHOP_CATEGORIES.includes(b.category)) throw httpErr(400, "Choose a category.");
    if (!/^\d{10}$/.test(phone)) throw httpErr(400, "Enter a valid 10-digit phone number.");
    if (password.length < 6) throw httpErr(400, "Password must be at least 6 characters.");
    if (db.vendors.some((v) => v.phone === phone)) throw httpErr(409, "This phone number already has a shop. Please log in.");
    const vendor = { id: uid(), name: owner, phone, pw: hashPw(password) };
    const shop = { id: uid(), vendorId: vendor.id, name: shopName, location, category: b.category, phone };
    db.vendors.push(vendor); db.shops.push(shop);
    const token = newSession(vendor);
    save();
    return send(res, 201, Object.assign({ token }, meOf(vendor)));
  }

  if (m === "POST" && p === "/api/login") {
    const b = await readBody(req);
    const phone = String(b.phone || "").trim();
    const v = db.vendors.find((x) => x.phone === phone);
    if (!v || !checkPw(String(b.password || ""), v.pw)) throw httpErr(401, "Phone number or password is incorrect.");
    const token = newSession(v);
    save();
    return send(res, 200, Object.assign({ token }, meOf(v)));
  }

  if (m === "POST" && p === "/api/logout") {
    const h = req.headers.authorization || "";
    if (h.startsWith("Bearer ")) { delete db.sessions[h.slice(7)]; save(); }
    return send(res, 200, { ok: true });
  }

  if (m === "GET" && p === "/api/me") return send(res, 200, meOf(requireVendor(req)));

  if (m === "GET" && p === "/api/products") {
    const shop = shopOf(requireVendor(req));
    return send(res, 200, db.products.filter((x) => x.shopId === shop.id));
  }

  if (m === "POST" && p === "/api/products") {
    const shop = shopOf(requireVendor(req));
    const b = await readBody(req);
    const data = cleanProduct(b);
    const product = Object.assign({ id: uid(), shopId: shop.id, image: null, createdAt: Date.now() }, data);
    if (b.image) product.image = saveImage(b.image);
    db.products.push(product);
    save();
    return send(res, 201, product);
  }

  if ((match = /^\/api\/products\/([a-f0-9]+)$/.exec(p)) && (m === "PUT" || m === "DELETE")) {
    const shop = shopOf(requireVendor(req));
    const product = db.products.find((x) => x.id === match[1] && x.shopId === shop.id);
    if (!product) throw httpErr(404, "Product not found.");
    if (m === "DELETE") {
      removeImage(product.image);
      db.products = db.products.filter((x) => x !== product);
      save();
      return send(res, 200, { ok: true });
    }
    const b = await readBody(req);
    Object.assign(product, cleanProduct(b));
    if (b.image) { const old = product.image; product.image = saveImage(b.image); removeImage(old); }
    else if (b.removeImage) { removeImage(product.image); product.image = null; }
    save();
    return send(res, 200, product);
  }

  if (m === "GET" && (match = /^\/api\/shop\/([a-f0-9]+)$/.exec(p))) {
    const shop = db.shops.find((s) => s.id === match[1]);
    if (!shop) throw httpErr(404, "This shop could not be found.");
    const products = db.products.filter((x) => x.shopId === shop.id).map((x) => ({
      id: x.id, name: x.name, price: x.price, category: x.category,
      description: x.description, available: x.available, image: x.image
    }));
    return send(res, 200, { shop: publicShop(shop), products });
  }

  throw httpErr(404, "Not found.");
}

/* ---------- static files ---------- */
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".ico": "image/x-icon"
};

function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  let file;
  let isUpload = false;
  if (rel.startsWith("/uploads/")) {
    isUpload = true;
    file = path.join(UPLOADS, path.basename(rel));
  } else {
    if (rel === "/") rel = "/index.html";
    const name = rel.slice(1);
    if (!SITE_FILES.includes(name)) { res.writeHead(404, { "Content-Type": "text/plain" }); return res.end("Not found"); }
    file = path.join(ROOT, name);
  }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain" }); return res.end("Not found"); }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      "Content-Type": TYPES[ext] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": isUpload ? "public, max-age=31536000, immutable" : "no-cache"
    });
    res.end(req.method === "HEAD" ? undefined : buf);
  });
}

/* ---------- server ---------- */
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url);
    if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405); return res.end(); }
    return serveStatic(req, res, url);
  } catch (e) {
    const status = e.status || 500;
    if (status === 500) console.error(e);
    if (!res.headersSent) send(res, status, { message: status === 500 ? "Server error." : e.message });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("\nDukaan is running.\n");
  console.log("  On this computer:  http://localhost:" + PORT);
  lanUrls().forEach((u) => console.log("  On your Wi-Fi:     " + u + "   (phones on the same Wi-Fi can open this)"));
  console.log("");
});
