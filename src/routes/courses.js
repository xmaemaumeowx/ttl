const express = require("express");
const router = express.Router();
const db = require("../db/postgres");

// Auth Middleware
function requireAuth(req, res, next) {
  if (!req.user) return res.redirect("/login");
  next();
}

// GET All Courses
router.get("/", requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM courses ORDER BY course_name`
    );

    res.render("courses", {
      pageTitle: "Courses | The Tech Lab",
      activePage: "courses",
      courses: result.rows || [],
      user: req.user,                       // ✅ FIXED
      success: req.query.success || "",     // ✅ FIXED
      error: req.query.error || "",         // ✅ FIXED
    });

  } catch (err) {
    console.error("Courses Load Error:", err);

    res.render("courses", {
      pageTitle: "Courses | The Tech Lab",
      activePage: "courses",
      courses: [],
      user: req.user,
      success: "",
      error: "Failed to load courses.",
    });
  }
});

// GET Single Course
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM courses WHERE course_id=$1`,
      [req.params.id]
    );

    if (!result.rows[0]) {
      return res.redirect("/courses?error=Course not found");
    }

    res.render("course-detail", {
      pageTitle: "Course Details | The Tech Lab",
      activePage: "courses",
      course: result.rows[0],
      user: req.user,    // ✅ ensure sidebar works
    });

  } catch (err) {
    console.error("Course Detail Error:", err);
    res.redirect("/courses?error=Something went wrong");
  }
});

module.exports = router;
