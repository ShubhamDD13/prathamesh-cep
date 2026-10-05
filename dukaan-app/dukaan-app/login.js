/*
  login.js  -  runs on login.html
  Checks the phone number and password with the server, then opens the dashboard.
*/

skipIfLoggedIn();

const loginForm = document.getElementById("loginForm");
const formMessage = document.getElementById("formMessage");
const submitBtn = document.getElementById("submitBtn");

loginForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const phone = document.getElementById("phone").value.trim();
  const password = document.getElementById("password").value;

  if (!/^\d{10}$/.test(phone)) {
    return showFormError(formMessage, "Please enter a valid 10-digit phone number.");
  }
  if (!password) {
    return showFormError(formMessage, "Please enter your password.");
  }

  formMessage.className = "msg";
  submitBtn.disabled = true;
  submitBtn.textContent = "Logging in...";

  api("/login", { method: "POST", body: { phone: phone, password: password }, auth: false })
    .then(function (result) {
      saveToken(result.token);
      window.location.href = "dashboard.html";
    })
    .catch(function (error) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Log in";
      showFormError(formMessage, error.message);
    });
});
