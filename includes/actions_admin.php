<?php
// ── Moderator and Admin actions ────────────────

// ── University Moderator actions ──────────────────────────────

function action_mod_batches(PDO $pdo, array $input): void {
    $user = require_auth($pdo);
    require_mod($user);
    $uniCode = trim((string)($input['uniCode'] ?? ''));
    if ($uniCode === '') json_out(['ok' => false, 'error' => 'uniCode required'], 400);
    
    // Verify mod has access to this university
    if ($user['role'] === 'university_moderator') {
        $st = $pdo->prepare('SELECT id FROM university_moderators WHERE user_id=? AND uni_code=?');
        $st->execute([$user['id'], $uniCode]);
        if (!$st->fetch()) json_out(['ok' => false, 'error' => 'Access denied for this university'], 403);
    }
    
    $st = $pdo->prepare(
        'SELECT b.batch_id AS id, b.batch_name AS name, b.dept_id AS deptId,
                d.dept_code AS deptCode, d.dept_name AS deptName, b.cr_user_id AS crUserId, p.name AS crName
         FROM batches b
         JOIN departments d ON d.dept_id = b.dept_id
         LEFT JOIN personal_info p ON p.user_id = b.cr_user_id
         WHERE d.uni_code=? ORDER BY d.dept_name, b.batch_name'
    );
    $st->execute([$uniCode]);
    $batches = array_map(fn($r) => [
        'id' => (int)$r['id'], 
        'name' => $r['name'], 
        'deptId' => (int)$r['deptId'],
        'deptCode' => $r['deptCode'], 
        'deptName' => $r['deptName'], 
        'crUserId' => $r['crUserId'] ? (int)$r['crUserId'] : null, 
        'crName' => $r['crName']
    ], $st->fetchAll());
    
    json_out(['ok' => true, 'batches' => $batches]);
}

function action_mod_assign_cr(PDO $pdo, array $input): void {
    $user      = require_auth($pdo);
    require_mod($user);
    $targetId  = (int)($input['userId']  ?? 0);
    $batchId   = (int)($input['batchId'] ?? 0);
    if ($targetId < 1 || $batchId < 1) json_out(['ok' => false, 'error' => 'userId and batchId required'], 400);
    
    // Get batch uni_code for access check
    $st = $pdo->prepare(
        'SELECT b.batch_id, b.cr_user_id, d.uni_code 
         FROM batches b
         JOIN departments d ON d.dept_id = b.dept_id
         WHERE b.batch_id=?'
    );
    $st->execute([$batchId]);
    $batch = $st->fetch();
    if (!$batch) json_out(['ok' => false, 'error' => 'Batch not found'], 404);
    
    if ($user['role'] === 'university_moderator') {
        $st = $pdo->prepare('SELECT id FROM university_moderators WHERE user_id=? AND uni_code=?');
        $st->execute([$user['id'], $batch['uni_code']]);
        if (!$st->fetch()) json_out(['ok' => false, 'error' => 'Access denied for this university'], 403);
    }
    
    // Get target's current role
    $st = $pdo->prepare('SELECT role FROM users WHERE id=? AND deleted_at IS NULL');
    $st->execute([$targetId]);
    $target = $st->fetch();
    if (!$target) json_out(['ok' => false, 'error' => 'User not found'], 404);
    
    $pdo->beginTransaction();
    try {
        // Remove old CR from batch if any
        if ($batch['cr_user_id']) {
            $oldCrId = (int)$batch['cr_user_id'];
            $pdo->prepare("UPDATE users SET role='student' WHERE id=?")->execute([$oldCrId]);
            log_role_change($pdo, $oldCrId, 'cr', 'student', $user['id']);
        }
        
        // Assign new CR
        $pdo->prepare("UPDATE users SET role='cr' WHERE id=?")->execute([$targetId]);
        $pdo->prepare('UPDATE batches SET cr_user_id=? WHERE batch_id=?')->execute([$targetId, $batchId]);
        log_role_change($pdo, $targetId, $target['role'], 'cr', $user['id']);
        
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
    json_out(['ok' => true]);
}

// ── Admin actions ─────────────────────────────────────────────

function action_admin_overview(PDO $pdo, array $input): void {
    $user = require_auth($pdo);
    require_admin($user);
    $counts = [];
    foreach (['users','universities','departments','batches','courses','student_enrollments','exams','tasks','notices'] as $t) {
        $counts[$t] = (int)$pdo->query("SELECT COUNT(*) FROM $t")->fetchColumn();
    }
    foreach (['student','cr','university_moderator','admin'] as $role) {
        $counts["role_$role"] = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role='$role'")->fetchColumn();
    }
    $users = [];
    $st = $pdo->query("SELECT u.id, u.email, u.role, u.is_active, u.created_at, p.name FROM users u LEFT JOIN personal_info p ON p.user_id=u.id ORDER BY u.created_at DESC");
    foreach ($st->fetchAll() as $r) {
        $users[] = ['id' => (int)$r['id'], 'email' => $r['email'], 'role' => $r['role'], 'name' => $r['name'], 'isActive' => (bool)(int)$r['is_active'], 'createdAt' => (new DateTimeImmutable((string)$r['created_at']))->format('c')];
    }
    
    // Universal Access Fetches
    $universities = $pdo->query("SELECT uni_code, uni_name FROM universities ORDER BY uni_name")->fetchAll(PDO::FETCH_ASSOC);
    
    $departments = $pdo->query("SELECT d.dept_id, d.dept_code, d.dept_name, d.uni_code, u.uni_name FROM departments d JOIN universities u ON u.uni_code = d.uni_code ORDER BY u.uni_name, d.dept_name")->fetchAll(PDO::FETCH_ASSOC);
    
    $batches = $pdo->query("SELECT b.batch_id, b.batch_name, b.dept_id, d.dept_code, u.uni_code, b.cr_user_id, p.name AS crName FROM batches b JOIN departments d ON d.dept_id = b.dept_id JOIN universities u ON u.uni_code = d.uni_code LEFT JOIN personal_info p ON p.user_id = b.cr_user_id ORDER BY b.batch_id DESC")->fetchAll(PDO::FETCH_ASSOC);
    
    $courses = $pdo->query("SELECT c.course_id, c.course_code, c.course_name, c.credit_hours, c.batch_id, b.batch_name FROM courses c JOIN batches b ON b.batch_id = c.batch_id ORDER BY c.course_id DESC")->fetchAll(PDO::FETCH_ASSOC);
    
    // Fetch all notices with university info
    $noticesSt = $pdo->query("
        SELECT n.id, n.title, n.description, n.category, n.priority, n.is_pinned, n.posted_by, n.posted_by_user_id,
               n.batch_id, b.batch_name, d.dept_code, d.uni_code, u.uni_name,
               n.posted_at
        FROM notices n
        LEFT JOIN batches b ON b.batch_id = n.batch_id
        LEFT JOIN departments d ON d.dept_id = b.dept_id
        LEFT JOIN universities u ON u.uni_code = d.uni_code
        ORDER BY n.posted_at DESC
    ");
    $notices = [];
    foreach ($noticesSt->fetchAll() as $r) {
        $notices[] = [
            'id'          => (int)$r['id'],
            'title'       => $r['title'],
            'description' => $r['description'],
            'category'    => $r['category'],
            'priority'    => $r['priority'],
            'isPinned'    => (bool)(int)$r['is_pinned'],
            'postedBy'    => $r['posted_by'],
            'batchName'   => $r['batch_name'],
            'deptCode'    => $r['dept_code'],
            'uniCode'     => $r['uni_code'],
            'uniName'     => $r['uni_name'],
            'postedAt'    => $r['posted_at'],
        ];
    }
    
    json_out([
        'ok' => true, 
        'counts' => $counts, 
        'users' => $users,
        'universities' => $universities,
        'departments' => $departments,
        'batches' => $batches,
        'courses' => $courses,
        'notices' => $notices
    ]);
}

function action_admin_user_role_update(PDO $pdo, array $input): void {
    $user     = require_auth($pdo);
    require_admin($user);
    $targetId = (int)($input['userId'] ?? 0);
    $role     = (string)($input['role'] ?? '');
    $batchId  = isset($input['batchId']) ? (int)$input['batchId'] : null;
    $uniCode  = isset($input['uniCode']) ? (string)$input['uniCode'] : null;
    
    if ($targetId < 1 || !in_array($role, ['student','cr','university_moderator','admin'], true))
        json_out(['ok' => false, 'error' => 'Invalid payload.'], 400);
        
    if ($targetId === $user['id']) json_out(['ok' => false, 'error' => 'Cannot change your own role'], 400);
    
    $st = $pdo->prepare('SELECT role FROM users WHERE id=? AND deleted_at IS NULL');
    $st->execute([$targetId]);
    $target = $st->fetch();
    if (!$target) json_out(['ok' => false, 'error' => 'User not found'], 404);
    
    $pdo->beginTransaction();
    try {
        // 1. Clean up old assignments if they are moving OUT of a role
        $pdo->prepare('DELETE FROM university_moderators WHERE user_id=?')->execute([$targetId]);
        
        // 2. Handle New Role Logic
        if ($role === 'cr') {
            if (!$batchId) {
                // Try to find current batch if not provided
                $st = $pdo->prepare('SELECT batch_id FROM academic_info WHERE user_id=?');
                $st->execute([$targetId]);
                $batchId = $st->fetchColumn();
                if (!$batchId) throw new Exception("Please select a batch for the CR.");
            }
            
            // Get dept and uni for the batch
            $st = $pdo->prepare('SELECT d.dept_id, d.uni_code FROM batches b JOIN departments d ON d.dept_id = b.dept_id WHERE b.batch_id=?');
            $st->execute([$batchId]);
            $bInfo = $st->fetch();
            if (!$bInfo) throw new Exception("Invalid batch selected.");

            // Ensure user has academic_info entry
            $pdo->prepare('INSERT INTO academic_info (user_id, batch_id, dept_id, reg_no) 
                           VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE batch_id=?, dept_id=?')
                ->execute([$targetId, $batchId, $bInfo['dept_id'], 'PENDING-'.time(), $batchId, $bInfo['dept_id']]);

            // Demote old CR of this batch
            $st = $pdo->prepare('SELECT cr_user_id FROM batches WHERE batch_id=?');
            $st->execute([$batchId]);
            $oldCrId = $st->fetchColumn();
            
            if ($oldCrId && $oldCrId != $targetId) {
                $pdo->prepare('UPDATE users SET role="student" WHERE id=?')->execute([$oldCrId]);
                log_role_change($pdo, $oldCrId, 'cr', 'student', $user['id']);
            }
            
            // Update batch CR
            $pdo->prepare('UPDATE batches SET cr_user_id=? WHERE batch_id=?')->execute([$targetId, $batchId]);
        } 
        else if ($role === 'university_moderator') {
            if (!$uniCode) throw new Exception("Please select a university for the moderator.");
            $pdo->prepare('INSERT INTO university_moderators (user_id, uni_code) VALUES (?,?) ON DUPLICATE KEY UPDATE uni_code=?')
                ->execute([$targetId, $uniCode, $uniCode]);
        }
        
        // 3. Update User Role
        $pdo->prepare('UPDATE users SET role=? WHERE id=?')->execute([$role, $targetId]);
        log_role_change($pdo, $targetId, $target['role'], $role, $user['id']);
        
        $pdo->commit();
    } catch(Throwable $e) {
        $pdo->rollBack();
        json_out(['ok' => false, 'error' => $e->getMessage()], 500);
    }
    json_out(['ok' => true]);
}

function action_admin_user_delete(PDO $pdo, array $input): void {
    $user     = require_auth($pdo);
    require_admin($user);
    $targetId = (int)($input['userId'] ?? 0);
    if ($targetId < 1) json_out(['ok' => false, 'error' => 'Invalid id'], 400);
    if ($targetId === $user['id']) json_out(['ok' => false, 'error' => 'Cannot delete your own account'], 400);
    
    // Soft delete
    $st = $pdo->prepare('UPDATE users SET deleted_at=NOW(), is_active=0 WHERE id=?');
    $st->execute([$targetId]);
    if ($st->rowCount() === 0) json_out(['ok' => false, 'error' => 'User not found'], 404);
    json_out(['ok' => true]);
}

function action_admin_university_add(PDO $pdo, array $input): void {
    require_admin(require_auth($pdo));
    $code = trim((string)($input['uniCode'] ?? ''));
    $name = trim((string)($input['uniName'] ?? ''));
    if ($code === '' || $name === '') json_out(['ok' => false, 'error' => 'uniCode and uniName required'], 400);
    try {
        $pdo->prepare('INSERT INTO universities (uni_code,uni_name) VALUES (?,?)')->execute([$code,$name]);
    } catch (PDOException $e) {
        if ((int)$e->errorInfo[1] === 1062) json_out(['ok' => false, 'error' => 'University code already exists'], 409);
        throw $e;
    }
    json_out(['ok' => true, 'university' => ['uniCode' => $code, 'uniName' => $name]]);
}

function action_admin_department_add(PDO $pdo, array $input): void {
    require_admin(require_auth($pdo));
    $code    = trim((string)($input['deptCode'] ?? ''));
    $name    = trim((string)($input['deptName'] ?? ''));
    $uniCode = trim((string)($input['uniCode']  ?? ''));
    if ($code === '' || $name === '' || $uniCode === '') json_out(['ok' => false, 'error' => 'deptCode, deptName and uniCode required'], 400);
    try {
        $pdo->prepare('INSERT INTO departments (dept_code,dept_name,uni_code) VALUES (?,?,?)')->execute([$code,$name,$uniCode]);
        $deptId = (int)$pdo->lastInsertId();
    } catch (PDOException $e) {
        if ((int)$e->errorInfo[1] === 1062) json_out(['ok' => false, 'error' => 'Department code already exists for this university'], 409);
        throw $e;
    }
    json_out(['ok' => true, 'department' => ['deptId' => $deptId, 'deptCode' => $code, 'deptName' => $name, 'uniCode' => $uniCode]]);
}

function action_admin_batch_add(PDO $pdo, array $input): void {
    require_admin(require_auth($pdo));
    $name   = trim((string)($input['batchName'] ?? ''));
    $deptId = (int)($input['deptId'] ?? 0);
    if ($name === '' || $deptId < 1) json_out(['ok' => false, 'error' => 'batchName and deptId required'], 400);
    
    $pdo->prepare('INSERT INTO batches (batch_name, dept_id) VALUES (?,?)')->execute([$name, $deptId]);
    json_out(['ok' => true, 'batch' => ['batchId' => (int)$pdo->lastInsertId(), 'batchName' => $name, 'deptId' => $deptId]]);
}

function action_admin_course_add(PDO $pdo, array $input): void {
    require_admin(require_auth($pdo));
    $code    = trim((string)($input['courseCode'] ?? ''));
    $name    = trim((string)($input['courseName'] ?? ''));
    $batchId = (int)($input['batchId'] ?? 0);
    $credits = is_numeric($input['creditHours'] ?? null) ? (float)$input['creditHours'] : 3.0;
    
    if ($code === '' || $name === '' || $batchId < 1) json_out(['ok' => false, 'error' => 'Code, name and batch required'], 400);
    try {
        $pdo->prepare('INSERT INTO courses (course_code,course_name,batch_id,credit_hours) VALUES (?,?,?,?)')->execute([$code,$name,$batchId,$credits]);
    } catch (PDOException $e) {
        if ((int)$e->errorInfo[1] === 1062) json_out(['ok' => false, 'error' => 'Course code already exists for this batch'], 409);
        throw $e;
    }
    json_out(['ok' => true, 'course' => ['courseId' => (int)$pdo->lastInsertId(), 'courseCode' => $code, 'courseName' => $name, 'batchId' => $batchId, 'creditHours' => $credits]]);
}

function action_admin_notice_update(PDO $pdo, array $input): void {
    require_admin(require_auth($pdo));
    $id    = (int)($input['id'] ?? 0);
    $title = trim((string)($input['title']       ?? ''));
    $desc  = trim((string)($input['description'] ?? ''));
    $cat   = trim((string)($input['category']    ?? 'general'));
    $pri   = trim((string)($input['priority']    ?? 'general'));
    $pin   = (int)(bool)($input['isPinned']      ?? false);
    if ($id < 1 || $title === '' || $desc === '') json_out(['ok' => false, 'error' => 'Invalid data'], 400);
    $st = $pdo->prepare('UPDATE notices SET title=?,description=?,category=?,priority=?,is_pinned=? WHERE id=?');
    $st->execute([$title,$desc,$cat,$pri,$pin,$id]);
    if ($st->rowCount() === 0) json_out(['ok' => false, 'error' => 'Notice not found'], 404);
    json_out(['ok' => true]);
}

function action_admin_notice_delete(PDO $pdo, array $input): void {
    require_admin(require_auth($pdo));
    $id = (int)($input['id'] ?? 0);
    if ($id < 1) json_out(['ok' => false, 'error' => 'Invalid id'], 400);
    $st = $pdo->prepare('DELETE FROM notices WHERE id=?');
    $st->execute([$id]);
    if ($st->rowCount() === 0) json_out(['ok' => false, 'error' => 'Notice not found'], 404);
    json_out(['ok' => true]);
}

// ── Additional Admin CRUD ─────────────────────────────────────
function action_admin_user_details(PDO $pdo, array $input): void {
    require_admin(require_auth($pdo));
    $userId = (int)($input['userId'] ?? 0);
    
    // Academic info
    $st = $pdo->prepare('SELECT a.reg_no, b.batch_name, b.batch_id, d.dept_code, d.dept_name, d.uni_code, u.uni_name FROM academic_info a JOIN batches b ON b.batch_id=a.batch_id JOIN departments d ON d.dept_id=a.dept_id JOIN universities u ON u.uni_code=d.uni_code WHERE a.user_id=?');
    $st->execute([$userId]);
    $academic = $st->fetch(PDO::FETCH_ASSOC) ?: null;
    
    // Personal info
    $st2 = $pdo->prepare('SELECT name, father_name, mother_name, contact_no, address FROM personal_info WHERE user_id=?');
    $st2->execute([$userId]);
    $personal = $st2->fetch(PDO::FETCH_ASSOC) ?: null;
    
    json_out(['ok' => true, 'academic' => $academic, 'personal' => $personal]);
}

function action_admin_university_update(PDO $pdo, array $input): void {
    require_admin(require_auth($pdo));
    $oldCode = trim((string)($input['oldCode'] ?? ''));
    $newCode = trim((string)($input['newCode'] ?? ''));
    $name = trim((string)($input['name'] ?? ''));
    $pdo->prepare('UPDATE universities SET uni_code=?, uni_name=? WHERE uni_code=?')->execute([$newCode, $name, $oldCode]);
    json_out(['ok' => true]);
}
function action_admin_university_delete(PDO $pdo, array $input): void {
    require_admin(require_auth($pdo));
    $pdo->prepare('DELETE FROM universities WHERE uni_code=?')->execute([trim((string)($input['code'] ?? ''))]);
    json_out(['ok' => true]);
}
function action_admin_department_update(PDO $pdo, array $input): void {
    require_admin(require_auth($pdo));
    $id = (int)($input['id'] ?? 0);
    $code = trim((string)($input['code'] ?? ''));
    $name = trim((string)($input['name'] ?? ''));
    $pdo->prepare('UPDATE departments SET dept_code=?, dept_name=? WHERE dept_id=?')->execute([$code, $name, $id]);
    json_out(['ok' => true]);
}
function action_admin_department_delete(PDO $pdo, array $input): void {
    require_admin(require_auth($pdo));
    $pdo->prepare('DELETE FROM departments WHERE dept_id=?')->execute([(int)($input['id'] ?? 0)]);
    json_out(['ok' => true]);
}
function action_admin_batch_update(PDO $pdo, array $input): void {
    require_admin(require_auth($pdo));
    $id = (int)($input['id'] ?? 0);
    $name = trim((string)($input['name'] ?? ''));
    $pdo->prepare('UPDATE batches SET batch_name=? WHERE batch_id=?')->execute([$name, $id]);
    json_out(['ok' => true]);
}
function action_admin_batch_delete(PDO $pdo, array $input): void {
    require_admin(require_auth($pdo));
    $pdo->prepare('DELETE FROM batches WHERE batch_id=?')->execute([(int)($input['id'] ?? 0)]);
    json_out(['ok' => true]);
}
function action_admin_course_update(PDO $pdo, array $input): void {
    require_admin(require_auth($pdo));
    $id = (int)($input['id'] ?? 0);
    $code = trim((string)($input['code'] ?? ''));
    $name = trim((string)($input['name'] ?? ''));
    $pdo->prepare('UPDATE courses SET course_code=?, course_name=? WHERE course_id=?')->execute([$code, $name, $id]);
    json_out(['ok' => true]);
}
function action_admin_course_delete(PDO $pdo, array $input): void {
    require_admin(require_auth($pdo));
    $pdo->prepare('DELETE FROM courses WHERE course_id=?')->execute([(int)($input['id'] ?? 0)]);
    json_out(['ok' => true]);
}
