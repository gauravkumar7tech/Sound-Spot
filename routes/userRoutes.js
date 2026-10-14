const express = require("express");
const userController = require("../controllers/userController");
const router = express.Router();
const User = require("../models/Users.js");

router.use((req, res, next) => {
    if (req.session && req.session.user) {
        next();
        return;
    }

    res.render("404", {
        user: req.session && req.session.user ? req.session.user : "",
        currentPage: "404",
    });
});

router.get("/users", async (req, res) => {
    try {
      const users = await User.find();
      res.render("AdminPart/ManageUsers", {
        currentPage: "ManageUsers",
        user: req.session.user,
        users,
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).send("Internal Server Error");
    }
  });

router.post('/auth/delete-users', userController.deleteUser);
router.post("/users", userController.addUser);

module.exports = router;
