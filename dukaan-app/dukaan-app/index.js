/*
  index.js  -  landing page.
  Only one job: if the owner is already logged in, show a Dashboard link
  instead of "Log in / Get started".
*/

if (getToken()) {
  api("/me").then(function () {
    document.getElementById("navLinks").innerHTML =
      '<a class="hide-sm" href="#how">How it works</a>' +
      '<a class="hide-sm" href="#features">Features</a>' +
      '<a class="btn small" href="dashboard.html">Go to dashboard</a>';
  }).catch(function () {});
}
