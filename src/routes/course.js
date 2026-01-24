const express = require("express");
const router = express.Router();
const db = require("../db/postgres");

function requireAuth(req, res, next) {
  if (!req.user) return res.redirect("/login");
  next();
}

router.get("/", requireAuth, async (req, res) => {
  const result = await db.query(`SELECT * FROM courses ORDER BY course_name`);
  res.render("courses", {
    pageTitle: "Courses | The Tech Lab",
    activePage: "courses",
    courses: result.rows,
  });
});

router.get("/:id", requireAuth, async (req, res) => {
  const course = await db.query(
    `SELECT * FROM courses WHERE course_id=$1`,
    [req.params.id]
  );

  if (!course.rows[0]) return res.redirect("/courses");

  res.render("course-detail", {
    pageTitle: "Course Details",
    activePage: "courses",
    course: course.rows[0],
  });
});

module.exports = router;
