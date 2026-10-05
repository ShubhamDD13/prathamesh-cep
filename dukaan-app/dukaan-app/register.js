/*
  register.js  -  runs on register.html
  Checks the form, sends it to the server, then opens the dashboard.
*/

skipIfLoggedIn();

const registerForm = document.getElementById("registerForm");
const formMessage = document.getElementById("formMessage");
const submitBtn = document.getElementById("submitBtn");

registerForm.addEventListener("submit", function (event) {
  event.preventDefault();

  // 1. Read what the owner typed
  const details = {
    shopName: document.getElementById("shopName").value.trim(),
    owner: document.getElementById("ownerName").value.trim(),
    category: document.getElementById("category").value,
    location: document.getElementById("location").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    password: document.getElementById("password").value
  };
  const confirmPassword = document.getElementById("confirmPassword").value;

  // 2. Check it
  if (!details.shopName || !details.owner || !details.category || !details.location) {
    return showFormError(formMessage, "Please fill in all fields.");
  }
  if (!/^\d{10}$/.test(details.phone)) {
    return showFormError(formMessage, "Please enter a valid 10-digit phone number.");
  }
  if (details.password.length < 6) {
    return showFormError(formMessage, "Password must be at least 6 characters.");
  }
  if (details.password !== confirmPassword) {
    return showFormError(formMessage, "Passwords do not match.");
  }

  // 3. Send it to the server
  formMessage.className = "msg";
  submitBtn.disabled = true;
  submitBtn.textContent = "Creating your shop...";

  api("/register", { method: "POST", body: details, auth: false })
    .then(function (result) {
      saveToken(result.token);           // remember that we are logged in
      window.location.href = "dashboard.html";
    })
    .catch(function (error) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Create my shop";
      showFormError(formMessage, error.message);
    });
});
