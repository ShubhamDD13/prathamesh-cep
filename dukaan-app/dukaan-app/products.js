/*
  products.js  -  runs on products.html
  Shows the product list and handles add, edit, delete and photos.
*/

startOwnerPage(function () {

  /* ---------- Things on the page ---------- */
  const formPanel = document.getElementById("formPanel");
  const formTitle = document.getElementById("formTitle");
  const productForm = document.getElementById("productForm");
  const formMessage = document.getElementById("formMessage");
  const saveBtn = document.getElementById("saveBtn");
  const productList = document.getElementById("productList");

  const nameInput = document.getElementById("productName");
  const priceInput = document.getElementById("productPrice");
  const categoryInput = document.getElementById("productCategory");
  const descriptionInput = document.getElementById("productDescription");
  const availableInput = document.getElementById("productAvailable");

  const photoPreview = document.getElementById("photoPreview");
  const photoInput = document.getElementById("photoInput");
  const photoRemoveBtn = document.getElementById("photoRemoveBtn");

  /* ---------- What we remember while the page is open ---------- */
  let products = [];          // the owner's products
  let editingId = null;       // id of the product being edited (null = adding a new one)

  // The photo choice for the form:
  //   mode "keep"   = leave the photo as it is
  //   mode "new"    = upload the newly chosen photo (data holds it)
  //   mode "remove" = delete the existing photo
  let photo = { mode: "keep", data: null, existingUrl: null };


  /* ============================================================
     LOAD AND SHOW THE LIST
  ============================================================ */

  function loadProducts() {
    return api("/products").then(function (list) {
      products = list;
      showList();
    });
  }

  function showList() {
    // No products yet
    if (products.length === 0) {
      productList.innerHTML =
        '<div class="empty">' +
          '<h2 class="sub">No products yet</h2>' +
          '<p>Add your first product to start building your digital catalogue.</p>' +
          '<button class="btn" id="emptyAddBtn" type="button">+ Add your first product</button>' +
        '</div>';
      document.getElementById("emptyAddBtn").onclick = function () { openForm(null); };
      return;
    }

    // One row per product
    let rows = "";
    products.forEach(function (p) {
      const categoryName = PRODUCT_CATEGORIES[p.category] || p.category;
      const extra = p.description ? " \u00B7 " + esc(p.description) : "";
      const stockClass = p.available ? "in" : "out";
      const stockText = p.available ? "In stock" : "Out of stock";

      rows +=
        '<div class="prow" data-id="' + esc(p.id) + '">' +
          productThumb(p) +
          '<div class="info">' +
            '<h3>' + esc(p.name) + '</h3>' +
            '<p class="meta">' + esc(categoryName) + extra + '</p>' +
          '</div>' +
          '<div class="price">' + rupees(p.price) + '</div>' +
          '<button class="badge ' + stockClass + '" data-action="toggle" type="button">' + stockText + '</button>' +
          '<div class="acts">' +
            '<button class="textbtn" data-action="edit" type="button">Edit</button>' +
            '<button class="textbtn danger" data-action="delete" type="button">Delete</button>' +
          '</div>' +
        '</div>';
    });

    const count = products.length + " product" + (products.length === 1 ? "" : "s");
    productList.innerHTML =
      '<p class="muted" style="margin-bottom:8px;font-size:.9rem">' + count + '</p>' +
      '<div class="plist">' + rows + '</div>';
  }


  /* ============================================================
     OPEN AND CLOSE THE FORM
  ============================================================ */

  function showPhotoPreview(url) {
    if (url) {
      photoPreview.innerHTML = '<img src="' + esc(url) + '" alt="Product photo preview">';
      photoRemoveBtn.hidden = false;
    } else {
      photoPreview.textContent = "No photo";
      photoRemoveBtn.hidden = true;
    }
  }

  // product = a product to edit, or null to add a new one
  function openForm(product) {
    editingId = product ? product.id : null;
    photo = { mode: "keep", data: null, existingUrl: product && product.image ? product.image : null };

    formTitle.textContent = product ? "Edit product" : "Add a product";
    nameInput.value = product ? product.name : "";
    priceInput.value = product ? product.price : "";
    categoryInput.value = product ? product.category : "";
    descriptionInput.value = product ? (product.description || "") : "";
    availableInput.checked = product ? !!product.available : true;
    formMessage.className = "msg";
    showPhotoPreview(photo.existingUrl);

    formPanel.classList.add("open");
    formPanel.scrollIntoView({ block: "start" });
    nameInput.focus();
  }

  function closeForm() {
    editingId = null;
    formPanel.classList.remove("open");
  }

  document.getElementById("addBtn").onclick = function () { openForm(null); };
  document.getElementById("closeBtn").onclick = closeForm;


  /* ============================================================
     PHOTO
  ============================================================ */

  // Shrinks the photo (max 800 pixels) so it uploads quickly on mobile data
  function shrinkPhoto(file) {
    return new Promise(function (resolve, reject) {
      const url = URL.createObjectURL(file);
      const image = new Image();

      image.onload = function () {
        try {
          if (!image.width || !image.height) throw new Error("Invalid image dimensions.");
          const scale = Math.min(1, 800 / Math.max(image.width, image.height));
          const width = Math.round(image.width * scale);
          const height = Math.round(image.height * scale);

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Could not prepare the photo.");
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(image, 0, 0, width, height);

          resolve(canvas.toDataURL("image/jpeg", 0.82));
        } catch (error) {
          reject(error);
        } finally {
          URL.revokeObjectURL(url);
        }
      };

      image.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("Could not read that photo."));
      };

      image.src = url;
    });
  }

  // "Choose photo" button opens the hidden file picker
  document.getElementById("photoPickBtn").onclick = function () {
    photoInput.click();
  };

  // A photo was chosen
  photoInput.onchange = function () {
    const file = photoInput.files[0];
    photoInput.value = "";
    if (!file) return;

    if (!/^image\//.test(file.type)) {
      showToast("Please choose an image file", true);
      return;
    }

    shrinkPhoto(file).then(
      function (dataUrl) {
        photo.mode = "new";
        photo.data = dataUrl;
        showPhotoPreview(dataUrl);
      },
      function () {
        showToast("Could not read that photo", true);
      }
    );
  };

  // "Remove" button
  photoRemoveBtn.onclick = function () {
    photo.mode = photo.existingUrl ? "remove" : "keep";
    photo.data = null;
    showPhotoPreview(null);
  };


  /* ============================================================
     SAVE (add or update)
  ============================================================ */

  productForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const name = nameInput.value.trim();
    const price = parseFloat(priceInput.value);
    const category = categoryInput.value;

    if (!name || !category || isNaN(price) || price < 0) {
      return showFormError(formMessage, "Enter a name, a price of 0 or more, and a category.");
    }

    const body = {
      name: name,
      price: price,
      category: category,
      description: descriptionInput.value.trim(),
      available: availableInput.checked
    };
    if (photo.mode === "new") body.image = photo.data;
    if (photo.mode === "remove") body.removeImage = true;

    formMessage.className = "msg";
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    const wasEditing = editingId !== null;
    const path = wasEditing ? "/products/" + editingId : "/products";
    const method = wasEditing ? "PUT" : "POST";

    api(path, { method: method, body: body })
      .then(function () {
        closeForm();
        showToast(wasEditing ? "Product updated" : "Product added");
        return loadProducts();
      })
      .catch(function (error) {
        showFormError(formMessage, error.message);
      })
      .then(function () {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save product";
      });
  });


  /* ============================================================
     BUTTONS INSIDE THE LIST (stock toggle, edit, delete)
  ============================================================ */

  productList.addEventListener("click", function (event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const id = button.closest(".prow").getAttribute("data-id");
    const product = products.find(function (p) { return p.id === id; });
    if (!product) return;

    const action = button.getAttribute("data-action");

    // Edit
    if (action === "edit") {
      openForm(product);
      return;
    }

    // In stock / Out of stock
    if (action === "toggle") {
      api("/products/" + id, {
        method: "PUT",
        body: {
          name: product.name,
          price: product.price,
          category: product.category,
          description: product.description,
          available: !product.available
        }
      })
        .then(loadProducts)
        .then(function () { showToast("Availability updated"); })
        .catch(function (error) { showToast(error.message, true); });
      return;
    }

    // Delete (press twice to confirm)
    if (action === "delete") {
      if (button.dataset.sure) {
        api("/products/" + id, { method: "DELETE" })
          .then(loadProducts)
          .then(function () { showToast("Product deleted"); })
          .catch(function (error) { showToast(error.message, true); });
      } else {
        button.dataset.sure = "1";
        button.textContent = "Tap again to delete";
        setTimeout(function () {
          if (button.isConnected) {
            delete button.dataset.sure;
            button.textContent = "Delete";
          }
        }, 3000);
      }
    }
  });


  /* ---------- Start ---------- */
  loadProducts().catch(function (error) {
    productList.innerHTML = '<p class="muted">' + esc(error.message) + '</p>';
  });
});
