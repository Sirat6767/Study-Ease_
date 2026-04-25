<?php
// ── CR Actions: Batch management, courses, exams, files, notices ──

function action_cr_requests_list(PDO $pdo, array $input): void {
    $user = require_auth($pdo);
    require_cr($user);
    require_academic($user);
    
    $st = $pdo->prepare(
        'SELECT r.id, r.user_id AS userId, p.name, u.email, r.reg_no AS regNo, r.message, r.requested_at AS requestedAt
         FROM batch_join_requests r
         JOIN users u ON u.id = r.user_id
         JOIN personal_info p ON p.user_id = r.user_id
         WHERE r.batch_id = ? AND r.status = "pending"
         ORDER BY r.requested_at ASC'
    );
    $st->execute([$user['batch_id']]);
    json_out(['ok' => true, 'requests' => $st->fetchAll()]);
}

function action_cr_request_review(PDO $pdo, array $input): void {
    $user = require_auth($pdo);
    require_cr($user);
    require_academic($user);
    
    $reqId  = (int)($input['requestId'] ?? 0);
    $status = trim((string)($input['status'] ?? ''));
    if (!in_array($status, ['approved', 'rejected'], true)) json_out(['ok' => false, 'error' => 'Invalid status'], 400);
    
    $st = $pdo->prepare('SELECT user_id, batch_id, reg_no FROM batch_join_requests WHERE id = ? AND batch_id = ? AND status = "pending"');
    $st->execute([$reqId, $user['batch_id']]);
    $req = $st->fetch();
    if (!$req) json_out(['ok' => false, 'error' => 'Pending request not found'], 404);
    
    $pdo->beginTransaction();
    try {
        $pdo->prepare('UPDATE batch_join_requests SET status = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?')
            ->execute([$status, $user['id'], $reqId]);
            
        if ($status === 'approved') {
            // 1. Create academic info
            $pdo->prepare('INSERT INTO academic_info (user_id, dept_id, batch_id, reg_no) VALUES (?,?,?,?)')
                ->execute([$req['user_id'], $user['dept_id'], $req['batch_id'], $req['reg_no']]);
                
            // 2. Auto-enroll student into existing courses for this batch
            // Find courses that other students in this batch are enrolled in
            $stCourses = $pdo->prepare('SELECT DISTINCT course_id FROM student_enrollments WHERE batch_id = ?');
            $stCourses->execute([$user['batch_id']]);
            $courseIds = $stCourses->fetchAll(PDO::FETCH_COLUMN);
            
            if (!empty($courseIds)) {
                $enrollSt = $pdo->prepare('INSERT IGNORE INTO student_enrollments (user_id, course_id, batch_id) VALUES (?,?,?)');
                foreach ($courseIds as $cid) {
                    $enrollSt->execute([$req['user_id'], $cid, $user['batch_id']]);
                }
            }
        }
        $pdo->commit();
        json_out(['ok' => true]);
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_out(['ok' => false, 'error' => 'Failed to process request'], 500);
    }
}

function action_cr_course_add(PDO $pdo, array $input): void {
    $user = require_auth($pdo);
    require_cr($user);
    require_academic($user);
    
    $code    = trim((string)($input['courseCode'] ?? ''));
    $name    = trim((string)($input['courseName'] ?? ''));
    $credits = is_numeric($input['creditHours'] ?? null) ? (float)$input['creditHours'] : 3.0;
    
    if ($code === '' || $name === '') json_out(['ok' => false, 'error' => 'Code and Name required'], 400);
    
    $pdo->beginTransaction();
    try {
        // 1. Create or get course in batch
        $st = $pdo->prepare('SELECT course_id FROM courses WHERE course_code = ? AND batch_id = ?');
        $st->execute([$code, $user['batch_id']]);
        $courseId = $st->fetchColumn();
        
        if (!$courseId) {
            $pdo->prepare('INSERT INTO courses (course_code, course_name, batch_id, credit_hours) VALUES (?,?,?,?)')
                ->execute([$code, $name, $user['batch_id'], $credits]);
            $courseId = (int)$pdo->lastInsertId();
        }
        
        // 2. Enroll all current batch students (including the CR) into this course
        $stUsers = $pdo->prepare('SELECT user_id FROM academic_info WHERE batch_id = ?');
        $stUsers->execute([$user['batch_id']]);
        $studentIds = $stUsers->fetchAll(PDO::FETCH_COLUMN);
        
        if (!empty($studentIds)) {
            $enrollSt = $pdo->prepare('INSERT IGNORE INTO student_enrollments (user_id, course_id, batch_id) VALUES (?,?,?)');
            foreach ($studentIds as $sid) {
                $enrollSt->execute([$sid, $courseId, $user['batch_id']]);
            }
        }
        
        $pdo->commit();
        json_out(['ok' => true, 'courseId' => $courseId]);
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_out(['ok' => false, 'error' => 'Failed to add course'], 500);
    }
}

function action_cr_exam_add(PDO $pdo, array $input): void {
    $user = require_auth($pdo);
    require_cr($user);
    require_academic($user);
    
    $courseId = (int)($input['courseId'] ?? 0);
    $name     = trim((string)($input['name'] ?? ''));
    $date     = trim((string)($input['date'] ?? ''));
    $time     = trim((string)($input['time'] ?? '')) ?: null;
    $venue    = trim((string)($input['venue'] ?? '')) ?: null;
    $notes    = trim((string)($input['notes'] ?? '')) ?: null;
    
    if ($courseId < 1 || $name === '' || $date === '') json_out(['ok' => false, 'error' => 'Course, Name, and Date required'], 400);
    
    // Validate course belongs to batch
    $st = $pdo->prepare('SELECT course_id FROM courses WHERE course_id = ? AND batch_id = ?');
    $st->execute([$courseId, $user['batch_id']]);
    if (!$st->fetch()) json_out(['ok' => false, 'error' => 'Invalid course'], 400);
    
    $pdo->prepare('INSERT INTO exams (course_id, batch_id, created_by, name, exam_date, exam_time, venue, notes) VALUES (?,?,?,?,?,?,?,?)')
        ->execute([$courseId, $user['batch_id'], $user['id'], $name, $date, $time, $venue, $notes]);
        
    json_out(['ok' => true, 'examId' => (int)$pdo->lastInsertId()]);
}

function action_cr_file_upload(PDO $pdo, array $input): void {
    $user = require_auth($pdo);
    require_cr($user);
    require_academic($user);
    
    $courseId = (int)($input['courseId'] ?? 0);
    $url      = trim((string)($input['fileUrl'] ?? ''));
    $name     = trim((string)($input['fileName'] ?? ''));
    $type     = trim((string)($input['fileType'] ?? 'other'));
    
    if ($courseId < 1 || $url === '' || $name === '') json_out(['ok' => false, 'error' => 'Invalid data'], 400);
    $validTypes = ['lecture','assignment','past_paper','resource','other'];
    if (!in_array($type, $validTypes, true)) $type = 'other';
    
    $pdo->prepare('INSERT INTO course_files (course_id, uploaded_by, file_url, file_name, file_type) VALUES (?,?,?,?,?)')
        ->execute([$courseId, $user['id'], $url, $name, $type]);
        
    json_out(['ok' => true]);
}

// ── Notices (CR) ──────────────────────────────────────────────

function action_notice_add(PDO $pdo, array $input): void {
    $user = require_auth($pdo);
    require_cr($user);
    require_academic($user);
    
    $title  = trim((string)($input['title']       ?? ''));
    $desc   = trim((string)($input['description'] ?? ''));
    $cat    = trim((string)($input['category']    ?? 'general'));
    $pri    = trim((string)($input['priority']    ?? 'general'));
    $pin    = (int)(bool)($input['isPinned']      ?? false);
    $attach = trim((string)($input['attachmentUrl'] ?? '')) ?: null;
    
    if ($title === '' || $desc === '') json_out(['ok' => false, 'error' => 'Title and description required'], 400);
    
    $pdo->prepare(
        'INSERT INTO notices (title, description, category, priority, posted_by, posted_by_user_id, batch_id, is_pinned, attachment_url) 
         VALUES (?,?,?,?,?,?,?,?,?)'
    )->execute([$title, $desc, $cat, $pri, $user['name'], $user['id'], $user['batch_id'], $pin, $attach]);
    
    json_out(['ok' => true]);
}

function action_notice_update(PDO $pdo, array $input): void {
    $user = require_auth($pdo);
    require_cr($user);
    $id    = (int)($input['id'] ?? 0);
    $title = trim((string)($input['title']       ?? ''));
    $desc  = trim((string)($input['description'] ?? ''));
    if ($id < 1 || $title === '' || $desc === '') json_out(['ok' => false, 'error' => 'Invalid data'], 400);
    
    $st = $pdo->prepare('SELECT posted_by_user_id FROM notices WHERE id=?');
    $st->execute([$id]);
    $row = $st->fetch();
    if (!$row || (int)$row['posted_by_user_id'] !== $user['id']) json_out(['ok' => false, 'error' => 'You can only edit your own notices'], 403);
    
    $pdo->prepare('UPDATE notices SET title=?, description=? WHERE id=?')->execute([$title, $desc, $id]);
    json_out(['ok' => true]);
}

function action_notice_delete(PDO $pdo, array $input): void {
    $user = require_auth($pdo);
    require_cr($user);
    $id = (int)($input['id'] ?? 0);
    
    $st = $pdo->prepare('SELECT posted_by_user_id FROM notices WHERE id=?');
    $st->execute([$id]);
    $row = $st->fetch();
    if (!$row || (int)$row['posted_by_user_id'] !== $user['id']) json_out(['ok' => false, 'error' => 'Access denied'], 403);
    
    $pdo->prepare('DELETE FROM notices WHERE id=?')->execute([$id]);
    json_out(['ok' => true]);
}
