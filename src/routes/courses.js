const express = require("express");
const router = express.Router();
const db = require("../db/postgres");

/* ===============================
   AUTH MIDDLEWARE
================================ */
function requireAuth(req, res, next) {
  if (!req.user) return res.redirect("/login");
  next();
}


/* ===============================
   LIST COURSES
================================ */
router.get("/", requireAuth, async (req, res) => {
  try {
    let courses;

    if (req.user.role === "mentor") {
      const result = await db.query(
        `SELECT c.*, 
                u.*, 
                lt.*
         FROM courses c
         LEFT JOIN learning_tracks lt ON c.track_id = lt.track_id
         LEFT JOIN enrollments e ON c.track_id = e.track_id
         LEFT JOIN users u ON e.user_id = e.user_id
         WHERE mentor_id = $1
         `
      );
      courses = result.rows;
    } else {
      const result = await db.query(
        `SELECT c.*, 
                u.*, 
                lt.*
         FROM courses c
         LEFT JOIN learning_tracks lt ON c.track_id = lt.track_id
         LEFT JOIN enrollments e ON c.track_id = e.track_id
         LEFT JOIN users u ON e.user_id = e.user_id
         WHERE user_id = $1`,
        [req.user.userId]
      );
      courses = result.rows;
    }

    res.render("courses", {
      projects,
      success: req.query.success || "",
      error: req.query.error || "",
    });
  } catch (err) {
    console.error("Error fetching projects:", err);
    res.render("courses", {
      projects: [],
      success: "",
      error: "Failed to load projects",
    });
  }
});


module.exports = router;
