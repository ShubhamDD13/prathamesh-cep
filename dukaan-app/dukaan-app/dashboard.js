/*
  dashboard.js  -  runs on dashboard.html
  Fills in the owner's name, shop details and the three numbers.
*/

startOwnerPage(function (me) {

  const shop = me.shop;
  const shopPage = "shop.html?id=" + shop.id;

  // Names and links
  document.getElementById("welcomeTitle").textContent = "Welcome, " + me.owner;
  document.getElementById("viewShopBtn").href = shopPage;
  document.getElementById("previewLink").href = shopPage;

  document.getElementById("shopAvatar").textContent = initials(shop.name);
  document.getElementById("shopName").textContent = shop.name;
  document.getElementById("shopInfo").textContent =
    (SHOP_CATEGORIES[shop.category] || shop.category) + " \u00B7 " + shop.location;

  // Numbers (need the product list)
  api("/products")
    .then(function (products) {
      const inStock = products.filter(function (p) { return p.available; }).length;
      const withPhotos = products.filter(function (p) { return p.image; }).length;

      document.getElementById("statProducts").textContent = products.length;
      document.getElementById("statInStock").textContent = inStock;
      document.getElementById("statPhotos").textContent = withPhotos;
    })
    .catch(function (error) {
      showToast(error.message, true);
    });
});
