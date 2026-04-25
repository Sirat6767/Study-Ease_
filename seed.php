<?php
/**
 * One-time demo data seeder for Schema v5.
 * Run ONCE from the command line after importing database/schema.sql:
 *   php seed.php
 */
declare(strict_types=1);

if (php_sapi_name() !== 'cli') {
    header('HTTP/1.0 403 Forbidden');
    echo 'Run via CLI only: php seed.php';
    exit(1);
}

require_once __DIR__ . '/includes/db.php';

$pdo = studyease_pdo();

$n = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
if ($n > 0) {
    fwrite(STDERR, "Database already has users. Skipping seed.\n");
    exit(0);
}

$pdo->beginTransaction();
try {
    // 1. Universities
    $pdo->prepare('INSERT INTO universities (uni_code, uni_name) VALUES (?, ?)')
        ->execute(['SSTU', 'State Science and Technology University']);
    
    // 2. Departments
    $pdo->prepare('INSERT INTO departments (dept_code, dept_name, uni_code) VALUES (?, ?, ?)')
        ->execute(['CSE', 'Computer Science and Engineering', 'SSTU']);
    $deptId = (int)$pdo->lastInsertId();

    // 3. Users (Admin, Mod, CR, Students)
    $st = $pdo->prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)');
    $hash = password_hash('1234', PASSWORD_DEFAULT);
    
    $st->execute(['admin@studyease.com', $hash, 'admin']);
    $adminId = (int)$pdo->lastInsertId();
    
    $st->execute(['mod@sstu.edu', $hash, 'university_moderator']);
    $modId = (int)$pdo->lastInsertId();
    
    $st->execute(['cr@studyease.com', $hash, 'cr']);
    $crId = (int)$pdo->lastInsertId();
    
    $st->execute(['test@test.com', $hash, 'student']); // Approved student
    $studentId1 = (int)$pdo->lastInsertId();
    
    $st->execute(['alice@demo.com', $hash, 'student']); // Pending student
    $studentId2 = (int)$pdo->lastInsertId();

    // 4. Personal Info
    $st = $pdo->prepare('INSERT INTO personal_info (user_id, name) VALUES (?, ?)');
    $st->execute([$adminId, 'Admin Sam']);
    $st->execute([$modId, 'Prof. Moderator']);
    $st->execute([$crId, 'CR Jordan']);
    $st->execute([$studentId1, 'Alex Student']);
    $st->execute([$studentId2, 'Alice Pending']);

    // 5. University Moderators (Link mod to uni)
    $pdo->prepare('INSERT INTO university_moderators (user_id, uni_code) VALUES (?, ?)')
        ->execute([$modId, 'SSTU']);

    // 6. Batches
    $pdo->prepare('INSERT INTO batches (batch_name, dept_id, cr_user_id) VALUES (?, ?, ?)')
        ->execute(['CSE-2023', $deptId, $crId]);
    $batchId = (int)$pdo->lastInsertId();

    // 7. Academic Info (CR and Student 1 are in the batch)
    $st = $pdo->prepare('INSERT INTO academic_info (user_id, dept_id, batch_id, reg_no) VALUES (?, ?, ?, ?)');
    $st->execute([$crId, $deptId, $batchId, 'REG-CR-001']);
    $st->execute([$studentId1, $deptId, $batchId, 'REG-ST-002']);

    // 8. Batch Join Requests (Alice is pending)
    $pdo->prepare('INSERT INTO batch_join_requests (user_id, batch_id, reg_no, message) VALUES (?, ?, ?, ?)')
        ->execute([$studentId2, $batchId, 'REG-ST-003', 'Please approve my request!']);

    // 9. Courses
    $st = $pdo->prepare('INSERT INTO courses (course_code, course_name, batch_id, credit_hours) VALUES (?, ?, ?, ?)');
    $st->execute(['CSE201', 'Data Structures', $batchId, 3.0]);
    $course1 = (int)$pdo->lastInsertId();
    $st->execute(['EEE202', 'Digital Electronics', $batchId, 3.0]);
    $course2 = (int)$pdo->lastInsertId();

    // 10. Student Enrollments (CR and Student 1 are enrolled)
    $st = $pdo->prepare('INSERT INTO student_enrollments (user_id, course_id, batch_id) VALUES (?, ?, ?)');
    // CR Enrollments
    $st->execute([$crId, $course1, $batchId]);
    $st->execute([$crId, $course2, $batchId]);
    // Student 1 Enrollments
    $st->execute([$studentId1, $course1, $batchId]);
    $enroll1 = (int)$pdo->lastInsertId();
    $st->execute([$studentId1, $course2, $batchId]);
    $enroll2 = (int)$pdo->lastInsertId();

    // 11. Grade Components (for Student 1)
    $gc = $pdo->prepare('INSERT INTO grade_components (enrollment_id, course_id, type, name, max_marks, obtained) VALUES (?, ?, ?, ?, ?, ?)');
    $gc->execute([$enroll1, $course1, 'attendance', 'Attendance', 10, 8.5]);
    $gc->execute([$enroll1, $course1, 'ct', 'CT-1', 15, 12.0]);
    $gc->execute([$enroll1, $course1, 'final', 'Final Exam', 50, 40.0]);
    $gc->execute([$enroll2, $course2, 'midterm', 'Midterm', 30, 25.0]);

    // 12. Exams (Created by CR for the courses)
    $st = $pdo->prepare('INSERT INTO exams (course_id, batch_id, created_by, name, exam_date, exam_time, venue, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    $st->execute([$course1, $batchId, $crId, 'Data Structures Final', '2026-06-15', '09:00:00', 'Room 301', 'Chapters 1-8']);
    $st->execute([$course2, $batchId, $crId, 'Digital Electronics Midterm', '2026-05-20', '11:00:00', 'Lab B', 'Logic gates']);

    // 13. Notices (Posted by CR to the batch)
    $st = $pdo->prepare('INSERT INTO notices (title, description, category, priority, posted_by, posted_by_user_id, batch_id, is_pinned) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    $st->execute(['Exam Schedule Released', 'Check your dashboards for the new schedule.', 'exam', 'high', 'CR Jordan', $crId, $batchId, 1]);
    $st->execute(['Class Cancelled', 'Today\'s EEE lab is cancelled.', 'event', 'medium', 'CR Jordan', $crId, $batchId, 0]);

    // 14. Tasks (Personal for Student 1)
    $st = $pdo->prepare('INSERT INTO tasks (user_id, name, done, priority, due_date) VALUES (?, ?, ?, ?, ?)');
    $st->execute([$studentId1, 'Review Chapter 1', 0, 'high', '2026-05-10']);
    $st->execute([$studentId1, 'Submit Assignment', 1, 'normal', null]);

    // 15. Course Files (Uploaded by CR)
    $st = $pdo->prepare('INSERT INTO course_files (course_id, uploaded_by, file_url, file_name, file_type) VALUES (?, ?, ?, ?, ?)');
    $st->execute([$course1, $crId, 'https://example.com/slide1.pdf', 'Lecture 1 Slides', 'lecture']);
    $st->execute([$course2, $crId, 'https://example.com/hw.pdf', 'Homework 1', 'assignment']);

    // ──────────────────────────────────────────
    // UNIVERSITY 2: BUE — Bangladesh University of Engineering
    // ──────────────────────────────────────────
    $pdo->prepare('INSERT INTO universities (uni_code, uni_name) VALUES (?, ?)')
        ->execute(['BUE', 'Bangladesh University of Engineering']);

    // Dept
    $pdo->prepare('INSERT INTO departments (dept_code, dept_name, uni_code) VALUES (?, ?, ?)')
        ->execute(['EEE', 'Electrical and Electronic Engineering', 'BUE']);
    $bueDeptId = (int)$pdo->lastInsertId();

    // Re-prepare $st for user inserts (was last used for course_files with 5 params)
    $st = $pdo->prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)');

    // Moderator
    $st->execute(['mod2@bue.edu', $hash, 'university_moderator']);
    $mod2Id = (int)$pdo->lastInsertId();
    $pdo->prepare('INSERT INTO personal_info (user_id, name) VALUES (?, ?)')->execute([$mod2Id, 'Dr. BUE Moderator']);
    $pdo->prepare('INSERT INTO university_moderators (user_id, uni_code) VALUES (?, ?)')->execute([$mod2Id, 'BUE']);

    // CR
    $st->execute(['cr2@bue.edu', $hash, 'cr']);
    $cr2Id = (int)$pdo->lastInsertId();
    $pdo->prepare('INSERT INTO personal_info (user_id, name) VALUES (?, ?)')->execute([$cr2Id, 'CR Maya']);

    // Batch
    $pdo->prepare('INSERT INTO batches (batch_name, dept_id, cr_user_id) VALUES (?, ?, ?)')
        ->execute(['EEE-2022', $bueDeptId, $cr2Id]);
    $bueBatchId = (int)$pdo->lastInsertId();

    // Academic info for CR2
    $pdo->prepare('INSERT INTO academic_info (user_id, dept_id, batch_id, reg_no) VALUES (?, ?, ?, ?)')
        ->execute([$cr2Id, $bueDeptId, $bueBatchId, 'BUE-CR-001']);

    // Students
    $st->execute(['stu1@bue.edu', $hash, 'student']);
    $stu1Id = (int)$pdo->lastInsertId();
    $pdo->prepare('INSERT INTO personal_info (user_id, name) VALUES (?, ?)')->execute([$stu1Id, 'Bob EEE']);
    $pdo->prepare('INSERT INTO academic_info (user_id, dept_id, batch_id, reg_no) VALUES (?, ?, ?, ?)')
        ->execute([$stu1Id, $bueDeptId, $bueBatchId, 'BUE-ST-002']);

    $st->execute(['stu2@bue.edu', $hash, 'student']);
    $stu2Id = (int)$pdo->lastInsertId();
    $pdo->prepare('INSERT INTO personal_info (user_id, name) VALUES (?, ?)')->execute([$stu2Id, 'Sara EEE']);
    $pdo->prepare('INSERT INTO academic_info (user_id, dept_id, batch_id, reg_no) VALUES (?, ?, ?, ?)')
        ->execute([$stu2Id, $bueDeptId, $bueBatchId, 'BUE-ST-003']);

    // Courses
    $pdo->prepare('INSERT INTO courses (course_code, course_name, batch_id, credit_hours) VALUES (?, ?, ?, ?)')
        ->execute(['EEE301', 'Circuit Analysis', $bueBatchId, 3.0]);
    $bCourse1 = (int)$pdo->lastInsertId();
    $pdo->prepare('INSERT INTO courses (course_code, course_name, batch_id, credit_hours) VALUES (?, ?, ?, ?)')
        ->execute(['EEE302', 'Signals and Systems', $bueBatchId, 3.0]);
    $bCourse2 = (int)$pdo->lastInsertId();

    // Enrollments
    $enrollSt = $pdo->prepare('INSERT IGNORE INTO student_enrollments (user_id, course_id, batch_id) VALUES (?,?,?)');
    foreach ([$cr2Id, $stu1Id, $stu2Id] as $uid) {
        $enrollSt->execute([$uid, $bCourse1, $bueBatchId]);
        $enrollSt->execute([$uid, $bCourse2, $bueBatchId]);
    }

    // Exams
    $pdo->prepare('INSERT INTO exams (course_id, batch_id, created_by, name, exam_date, exam_time, venue, notes) VALUES (?,?,?,?,?,?,?,?)')
        ->execute([$bCourse1, $bueBatchId, $cr2Id, 'Circuit Final', '2026-07-10', '10:00:00', 'Room 201', 'All chapters']);

    // Notices
    $pdo->prepare('INSERT INTO notices (title, description, category, priority, posted_by, posted_by_user_id, batch_id, is_pinned) VALUES (?,?,?,?,?,?,?,?)')
        ->execute(['Lab Schedule', 'EEE lab sessions start next week.', 'event', 'medium', 'CR Maya', $cr2Id, $bueBatchId, 0]);

    // ──────────────────────────────────────────
    // UNIVERSITY 3: NUST — National University of Science & Technology
    // ──────────────────────────────────────────
    $pdo->prepare('INSERT INTO universities (uni_code, uni_name) VALUES (?, ?)')
        ->execute(['NUST', 'National University of Science and Technology']);

    // Depts
    $pdo->prepare('INSERT INTO departments (dept_code, dept_name, uni_code) VALUES (?, ?, ?)')
        ->execute(['ME', 'Mechanical Engineering', 'NUST']);
    $nustDept1 = (int)$pdo->lastInsertId();
    $pdo->prepare('INSERT INTO departments (dept_code, dept_name, uni_code) VALUES (?, ?, ?)')
        ->execute(['CS', 'Computer Science', 'NUST']);
    $nustDept2 = (int)$pdo->lastInsertId();

    // Moderator
    $st->execute(['mod3@nust.edu', $hash, 'university_moderator']);
    $mod3Id = (int)$pdo->lastInsertId();
    $pdo->prepare('INSERT INTO personal_info (user_id, name) VALUES (?, ?)')->execute([$mod3Id, 'Prof. NUST Admin']);
    $pdo->prepare('INSERT INTO university_moderators (user_id, uni_code) VALUES (?, ?)')->execute([$mod3Id, 'NUST']);

    // CR for ME
    $st->execute(['cr3@nust.edu', $hash, 'cr']);
    $cr3Id = (int)$pdo->lastInsertId();
    $pdo->prepare('INSERT INTO personal_info (user_id, name) VALUES (?, ?)')->execute([$cr3Id, 'CR Liam']);
    $pdo->prepare('INSERT INTO batches (batch_name, dept_id, cr_user_id) VALUES (?, ?, ?)')
        ->execute(['ME-2023', $nustDept1, $cr3Id]);
    $nustBatch1 = (int)$pdo->lastInsertId();
    $pdo->prepare('INSERT INTO academic_info (user_id, dept_id, batch_id, reg_no) VALUES (?, ?, ?, ?)')
        ->execute([$cr3Id, $nustDept1, $nustBatch1, 'NUST-ME-001']);

    // Students for ME
    $st->execute(['stu3@nust.edu', $hash, 'student']);
    $stu3Id = (int)$pdo->lastInsertId();
    $pdo->prepare('INSERT INTO personal_info (user_id, name) VALUES (?, ?)')->execute([$stu3Id, 'Zara ME']);
    $pdo->prepare('INSERT INTO academic_info (user_id, dept_id, batch_id, reg_no) VALUES (?, ?, ?, ?)')
        ->execute([$stu3Id, $nustDept1, $nustBatch1, 'NUST-ME-002']);

    // CR for CS
    $st->execute(['cr4@nust.edu', $hash, 'cr']);
    $cr4Id = (int)$pdo->lastInsertId();
    $pdo->prepare('INSERT INTO personal_info (user_id, name) VALUES (?, ?)')->execute([$cr4Id, 'CR Noah']);
    $pdo->prepare('INSERT INTO batches (batch_name, dept_id, cr_user_id) VALUES (?, ?, ?)')
        ->execute(['CS-2024', $nustDept2, $cr4Id]);
    $nustBatch2 = (int)$pdo->lastInsertId();
    $pdo->prepare('INSERT INTO academic_info (user_id, dept_id, batch_id, reg_no) VALUES (?, ?, ?, ?)')
        ->execute([$cr4Id, $nustDept2, $nustBatch2, 'NUST-CS-001']);

    // Students for CS
    $st->execute(['stu4@nust.edu', $hash, 'student']);
    $stu4Id = (int)$pdo->lastInsertId();
    $pdo->prepare('INSERT INTO personal_info (user_id, name) VALUES (?, ?)')->execute([$stu4Id, 'Aiden CS']);
    $pdo->prepare('INSERT INTO academic_info (user_id, dept_id, batch_id, reg_no) VALUES (?, ?, ?, ?)')
        ->execute([$stu4Id, $nustDept2, $nustBatch2, 'NUST-CS-002']);

    // Courses
    $pdo->prepare('INSERT INTO courses (course_code, course_name, batch_id, credit_hours) VALUES (?, ?, ?, ?)')
        ->execute(['ME401', 'Thermodynamics', $nustBatch1, 4.0]);
    $nCourse1 = (int)$pdo->lastInsertId();
    $pdo->prepare('INSERT INTO courses (course_code, course_name, batch_id, credit_hours) VALUES (?, ?, ?, ?)')
        ->execute(['CS401', 'Algorithms', $nustBatch2, 3.0]);
    $nCourse2 = (int)$pdo->lastInsertId();

    // Enrollments
    foreach ([$cr3Id, $stu3Id] as $uid) $enrollSt->execute([$uid, $nCourse1, $nustBatch1]);
    foreach ([$cr4Id, $stu4Id] as $uid) $enrollSt->execute([$uid, $nCourse2, $nustBatch2]);

    // Notices
    $pdo->prepare('INSERT INTO notices (title, description, category, priority, posted_by, posted_by_user_id, batch_id, is_pinned) VALUES (?,?,?,?,?,?,?,?)')
        ->execute(['Thermo Exam Date Set', 'Exam on July 20, Room 101.', 'exam', 'high', 'CR Liam', $cr3Id, $nustBatch1, 1]);
    $pdo->prepare('INSERT INTO notices (title, description, category, priority, posted_by, posted_by_user_id, batch_id, is_pinned) VALUES (?,?,?,?,?,?,?,?)')
        ->execute(['CS Assignment 1', 'Due Friday midnight via portal.', 'general', 'medium', 'CR Noah', $cr4Id, $nustBatch2, 0]);

    $pdo->commit();
    echo "✅ Seed completed successfully (v5 schema).\n\n";
    echo "Demo logins (Password for all is '1234'):\n";
    echo "  test@test.com       (Student — SSTU/CSE)\n";
    echo "  alice@demo.com      (Student — Pending Join)\n";
    echo "  cr@studyease.com    (CR — SSTU/CSE)\n";
    echo "  mod@sstu.edu        (Moderator — SSTU)\n";
    echo "  mod2@bue.edu        (Moderator — BUE)\n";
    echo "  mod3@nust.edu       (Moderator — NUST)\n";
    echo "  cr2@bue.edu         (CR — BUE/EEE)\n";
    echo "  cr3@nust.edu        (CR — NUST/ME)\n";
    echo "  cr4@nust.edu        (CR — NUST/CS)\n";
    echo "  admin@studyease.com (Admin)\n";

} catch (Throwable $e) {
    $pdo->rollBack();
    fwrite(STDERR, '❌ Seed failed: ' . $e->getMessage() . "\n");
    exit(1);
}
