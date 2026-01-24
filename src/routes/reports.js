// View learner progress for a course (mentor only)
router.get('/course/:courseId', requireAuth, requireMentor, async (req, res) => {
  const courseId = req.params.courseId;
  try {
    // Get course details
    const courseResult = await db.query(
      `SELECT course_id, course_name, description FROM courses WHERE course_id = $1`,
      [courseId]
    );
    const course = courseResult.rows[0];
    if (!course) return res.redirect('/reports?error=Course%20not%20found');

    // Get learners enrolled in this course
    const learnersResult = await db.query(
      `SELECT u.user_id, u.full_name
       FROM learner_courses lc
       JOIN users u ON lc.learner_id = u.user_id
       WHERE lc.course_id = $1
       ORDER BY u.full_name`,
      [courseId]
    );
    const learners = learnersResult.rows;

    // For each learner, fetch module and lesson completion
    const progress = [];
    for (const learner of learners) {
      const modulesResult = await db.query(
        `SELECT m.module_id, m.module_name,
                lm.status AS module_status, lm.last_updated
         FROM modules m
         LEFT JOIN learner_modules lm
         ON lm.module_id = m.module_id AND lm.learner_id = $1
         WHERE m.course_id = $2
         ORDER BY m.module_name`,
        [learner.user_id, courseId]
      );

      const modules = [];
      for (const mod of modulesResult.rows) {
        const lessonsResult = await db.query(
          `SELECT l.lesson_id, l.lesson_name,
                  ll.status AS lesson_status, ll.last_updated
           FROM lessons l
           LEFT JOIN learner_lessons ll
           ON ll.lesson_id = l.lesson_id AND ll.learner_id = $1
           WHERE l.module_id = $2
           ORDER BY l.lesson_name`,
          [learner.user_id, mod.module_id]
        );
        modules.push({
          ...mod,
          lessons: lessonsResult.rows
        });
      }

      progress.push({
        learner,
        modules
      });
    }

    const { success, error } = req.query;

    res.render('course-progress', {
      user: req.user,
      course,
      progress,
      success,
      error,
      pageTitle: `${course.course_name} - Learner Progress | The Tech Lab`,
      activePage: 'reports'
    });
  } catch (err) {
    console.error('Error loading course progress:', err);
    res.redirect('/reports?error=Failed%20to%20load%20course%20progress');
  }
});
// Mentor Dashboard Progress
router.get('/mentor-progress', requireAuth, requireMentor, async (req, res) => {
  try {
    const mentorId = req.user.userId;

    // --- 1. Fetch learners assigned to this mentor ---
    const learnersResult = await db.query(
      `SELECT u.user_id, u.full_name
       FROM mentor_learner ml
       JOIN users u ON ml.user_id = u.user_id
       WHERE ml.mentor_id = $1
       ORDER BY u.full_name`,
      [mentorId]
    );
    const learners = learnersResult.rows;

    // --- 2. Fetch courses & progress for each learner ---
    const courseProgress = [];
    for (const learner of learners) {
      const coursesResult = await db.query(
        `SELECT c.course_id, c.course_name
         FROM learner_courses lc
         JOIN courses c ON lc.course_id = c.course_id
         WHERE lc.learner_id = $1
         ORDER BY c.course_name`,
        [learner.user_id]
      );

      const courses = [];
      for (const course of coursesResult.rows) {
        const modulesResult = await db.query(
          `SELECT m.module_id, m.module_name, lm.status AS module_status
           FROM modules m
           LEFT JOIN learner_modules lm
             ON lm.module_id = m.module_id AND lm.learner_id = $1
           WHERE m.course_id = $2
           ORDER BY m.module_name`,
          [learner.user_id, course.course_id]
        );

        const modules = [];
        for (const mod of modulesResult.rows) {
          const lessonsResult = await db.query(
            `SELECT l.lesson_id, l.lesson_name, ll.status AS lesson_status
             FROM lessons l
             LEFT JOIN learner_lessons ll
               ON ll.lesson_id = l.lesson_id AND ll.learner_id = $1
             WHERE l.module_id = $2
             ORDER BY l.lesson_name`,
            [learner.user_id, mod.module_id]
          );
          modules.push({ ...mod, lessons: lessonsResult.rows });
        }

        courses.push({ ...course, modules });
      }

      courseProgress.push({ learner, courses });
    }

    // --- 3. Fetch projects for each learner ---
    const projects = [];
    for (const learner of learners) {
      const projResult = await db.query(
        `SELECT p.*, lt.track_name
         FROM projects p
         LEFT JOIN learning_tracks lt ON p.track_id = lt.track_id
         WHERE p.learner_id = $1
         ORDER BY p.start_date DESC`,
        [learner.user_id]
      );
      projects.push({ learner, projects: projResult.rows });
    }

    res.render('mentor-progress', {
      user: req.user,
      courseProgress,
      projects,
      pageTitle: 'Mentor Progress Dashboard | The Tech Lab',
      activePage: 'reports'
    });
  } catch (err) {
    console.error('Error loading mentor progress:', err);
    res.redirect('/dashboard?error=Failed%20to%20load%20mentor%20progress');
  }
});

module.exports = router;