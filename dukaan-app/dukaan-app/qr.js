/*
  qr.js  -  runs on qr.html
  Builds the shop link, draws the QR code, and handles Copy and Download.
*/

startOwnerPage(function (me) {

  const shop = me.shop;

  const linkInput = document.getElementById("linkInput");
  const qrCanvas = document.getElementById("qrCanvas");
  const qrNote = document.getElementById("qrNote");
  const copyBtn = document.getElementById("copyBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  let qrReady = false;

  document.getElementById("shopTitle").textContent = shop.name;
  downloadBtn.disabled = true;

  // The page address, with the shop id at the end.
  // Example:  http://192.168.1.5:3000/shop.html?id=abc123
  function drawEverything(baseAddress, note) {
    const shopLink = baseAddress + "/shop.html?id=" + shop.id;

    linkInput.value = shopLink;
    document.getElementById("previewLink").href = "shop.html?id=" + shop.id;
    qrNote.textContent = note;

    try {
      QRCode.toCanvas(
        qrCanvas,
        shopLink,
        { width: 240, margin: 1, color: { dark: "#0F1115", light: "#ffffff" } },
        function (error) {
          if (error) {
            showToast("Could not build the QR code", true);
            return;
          }
          qrReady = true;
          downloadBtn.disabled = false;
        }
      );
    } catch (e) {
      showToast("Could not build the QR code", true);
    }

    // Copy button
    copyBtn.onclick = function () {
      function done() {
        copyBtn.textContent = "Copied";
        setTimeout(function () { copyBtn.textContent = "Copy"; }, 1600);
      }
      function fallbackCopy() {
        linkInput.focus();
        linkInput.select();
        try {
          if (!document.execCommand("copy")) throw new Error("Copy command was not available.");
          done();
        } catch (e) {
          showToast("Could not copy the link. Select and copy it manually.", true);
        }
      }

      if (!navigator.clipboard) {
        fallbackCopy();
        return;
      }
      try {
        navigator.clipboard.writeText(shopLink).then(done, fallbackCopy);
      } catch (e) {
        fallbackCopy();
      }
    };

    // Download button: saves the QR code as a picture
    downloadBtn.onclick = function () {
      if (!qrReady) {
        showToast("The QR code is not ready to download yet.", true);
        return;
      }
      try {
        const link = document.createElement("a");
        link.download = shop.name.trim().replace(/\s+/g, "-").toLowerCase() + "-qr-code.png";
        link.href = qrCanvas.toDataURL("image/png");
        document.body.appendChild(link);
        link.click();
        link.remove();
      } catch (e) {
        showToast("Could not download the QR code.", true);
      }
    };
  }

  // If you opened the site as "localhost", a customer's phone can't use that address.
  // So we ask the server for this computer's Wi-Fi address and use that instead.
  const openedAsLocalhost = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

  if (!openedAsLocalhost) {
    drawEverything(location.origin, "This code always shows your latest products and photos, so you never need to print it again.");
    return;
  }

  api("/lan", { auth: false })
    .then(function (result) {
      if (result.urls && result.urls.length > 0) {
        drawEverything(result.urls[0], "This link uses your computer's Wi-Fi address, so phones on the same Wi-Fi can open it. To let anyone open it, put the project online.");
      } else {
        drawEverything(location.origin, "No Wi-Fi address was found. Connect to Wi-Fi, or put the project online, so phones can open this link.");
      }
    })
    .catch(function () {
      drawEverything(location.origin, "Could not find your Wi-Fi address, so this link only works on this computer.");
    });
});
