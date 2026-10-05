# Dukaan

Make a digital shop for a small vendor: products with photos, a QR code, and a page customers can open by scanning.

## How to run it
1. Install Node.js (version 18 or newer) from nodejs.org
2. Open this project folder (or its outer `dukaan-app` folder) in VS Code. Approve the automatic task the first time VS Code asks; it starts the server whenever the folder is opened.
3. Open http://localhost:3000 in your browser

To start the server manually instead, open a terminal in this project folder and type `node server.js`.

Nothing to install with npm. To stop the server press Ctrl + C in the terminal.

The terminal also prints a "Wi-Fi" address. Phones on the same Wi-Fi can open that address and scan your QR code.

## What each file does

START HERE
- README.md ........... this file

THE SERVER (the "back end")
- server.js ........... saves shops, products and photos; answers the web pages
- package.json ........ lets you type "npm start" instead of "node server.js"

THE LOOK
- style.css ........... all colours, fonts and layout for every page

SHARED CODE
- common.js ........... small helpers used by every page (login token, talking to the server)
- qrcode.min.js ....... library that draws the QR code (do not edit)

THE PAGES  (each page = one .html file + one .js file with the same name)
- index.html + index.js ............ home page (what Dukaan is)
- register.html + register.js ...... create a shop
- login.html + login.js ............ log in
- dashboard.html + dashboard.js .... owner's home: numbers and shortcuts
- products.html + products.js ...... add, edit, delete products and photos
- qr.html + qr.js .................. the QR code for the shop
- shop.html + shop.js .............. the page customers see after scanning

CREATED AUTOMATICALLY when you run the server (do not edit)
- data.json ........... your shops and products
- uploads/ ............ product photos

If `data.json` is missing, the server starts with an empty shop list. If it is invalid, the server stops rather than risk replacing your saved data.

## How the pages connect
index -> register -> dashboard -> products / qr -> shop (what customers see)

## Putting it online
Upload this folder to Node hosting such as Render (start command: node server.js).
Free plans usually erase saved data when the app restarts, so add a persistent disk or a database before real use.
