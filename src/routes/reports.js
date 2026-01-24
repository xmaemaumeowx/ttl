router.get("/", requireAuth, requireMentor, async (req, res) => {
  try {
    // 1️⃣ Get learners under this mentor's tracks
    const learnersResult = await db.query(
      `SELECT DISTINCT u.user_id, u.full_name
       FROM users u
       JOIN enrollments e ON u.user_id = e.user_id
       JOIN courses c ON e.course_id = c.course_id
       JOIN learning_tracks lt ON c.track_id = lt.track_id
       WHERE lt.mentor_id = $1
       ORDER BY u.full_name`,
      [req.user.userId]
    );
    const learners = learnersResult.rows;

    // 2️⃣ Get course enrollments
    const enrollmentsResult = await db.query(
      `SELECT e.enrollment_id, e.user_id, u.full_name, lt.track_name, c.course_name
       FROM enrollments e
       JOIN users u ON e.user_id = u.user_id
       JOIN courses c ON e.track_id = c.track_id
       JOIN learning_tracks lt ON c.track_id = lt.track_id
       WHERE lt.mentor_id = $1
       ORDER BY c.order_no`,
      [req.user.userId]
    );
    const enrollments = enrollmentsResult.rows;

    // 3️⃣ Get lesson progress
    const enrollmentIds = enrollments.map(e => e.enrollment_id);
    let lessonProgress = [];
    if (enrollmentIds.length) {
      const lessonResult = await db.query(
        `SELECT lp.enrollment_id, lp.lesson_id, lp.completed, l.lesson_title, lp.completed_at
         FROM lesson_progress lp
         JOIN lessons l ON lp.lesson_id = l.lesson_id
         WHERE lp.enrollment_id = ANY($1::bigint[])`,
        [enrollmentIds]
      );
      lessonProgress = lessonResult.rows;
    }

    // 4️⃣ Get projects for these learners
    const learnerIds = learners.map(l => l.user_id);
    let projects = [];
    if (learnerIds.length) {
      const projectsResult = await db.query(
        `SELECT p.*, u.full_name AS learner_name
         FROM projects p
         JOIN users u ON p.learner_id = u.user_id
         WHERE p.learner_id = ANY($1::bigint[])
         ORDER BY p.created_at DESC`,
        [learnerIds]
      );
      projects = projectsResult.rows;
    }

    res.render("mentor-progress", {
      pageTitle: "Reports | The Tech Lab",
      activePage: "reports",
      learners,
      enrollments,
      lessonProgress,
      projects,
      success: req.query.success || "",
      error: req.query.error || "",
    });
  } catch (err) {
    console.error("Reports error:", err);
    res.render("mentor-progress", {
      pageTitle: "Reports | The Tech Lab",
      activePage: "reports",
      learners: [],
      enrollments: [],
      lessonProgress: [],
      projects: [],
      success: "",
      error: "Failed to load report data.",
    });
  }
});
