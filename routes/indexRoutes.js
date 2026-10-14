const express = require("express");
const app = express();


app.get("/", (req, res) => {
  res.render("landing", {
    currentPage: "landing",
    user: req.session.user || "",
  });
});

// Index page (login/signup form)
app.get("/index", (req, res) => {
  const oauthBaseUrl = (process.env.OAUTH_BASE_URL || "https://soundspot-backend.onrender.com").replace(/\/+$/, "");

  if (req.session.user) {
    res.redirect("/auth/UserHomePage");
  } else {
    res.render("index", {
      currentPage: "index",
      user: req.session.user || "",
      oauthBaseUrl,
    });
  }
});
module.exports = app;
