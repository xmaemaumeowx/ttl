// src/routes/reports.js
const express = require("express");
const router = express.Router();
const { requireAuth, requireMentor } = require("../middleware/auth");

// Example: Course-level report
router.get("/course/:courseId", requireAuth, requireMentor, async (req, res) => {
  const { courseId } = req.params;

  try {
    // TODO: Replace with real DB logic
    const reportData = {
      courseId,
      totalStudents: 25,
      completed: 18,
      inProgress: 7,
    };

    res.render("reports/course", {
      user: req.user,
      report: reportData,
    });
  } catch (err) {
    console.error("Reports error:", err);
    res.status(500).send("Failed to load report");
  }
});

module.exports = router;
