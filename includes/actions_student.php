<?php
// ── Student actions: tasks, grade components, join requests ──

// ── Tasks (Personal) ──────────────────────────────────────────

function action_task_add(PDO $pdo, array $input): void {
    $user     = require_auth($pdo);
    $name     = trim((string)($input['name']     ?? ''));
    $priority = trim((string)($input['priority'] ?? 'normal'));
    $dueDate  = trim((string)($input['dueDate']  ?? '')) ?: null;
    if ($name === '') json_out(['ok' => false, 'error' => 'Task name required'], 400);
    if (!in_array($priority, ['low','normal','high'], true)) $priority = 'normal';
    $pdo->prepare('INSERT INTO tasks (user_id,name,done,priority,due_date) VALUES (?,?,0,?,?)')->execute([$user['id'],$name,$priority,$dueDate]);
    json_out(['ok' => true, 'task' => ['id' => (int)$pdo->lastInsertId(), 'name' => $name, 'done' => false, 'priority' => $priority, 'dueDate' => $dueDate]]);
}

function action_task_toggle(PDO $pdo, array $input): void {
    $user = require_auth($pdo);
    $id   = (int)($input['id'] ?? 0);
    if ($id < 1) json_out(['ok' => false, 'error' => 'Invalid id'], 400);
    $st = $pdo->prepare('SELECT done FROM tasks WHERE id=? AND user_id=?');
    $st->execute([$id, $user['id']]);
    $row = $st->fetch();
    if (!$row) json_out(['ok' => false, 'error' => 'Task not found'], 404);
    $new = (int)$row['done'] ? 0 : 1;
    $pdo->prepare('UPDATE tasks SET done=? WHERE id=? AND user_id=?')->execute([$new,$id,$user['id']]);
    json_out(['ok' => true, 'done' => (bool)$new]);
}

function action_task_delete(PDO $pdo, array $input): void {
    $user = require_auth($pdo);
    $id   = (int)($input['id'] ?? 0);
    if ($id < 1) json_out(['ok' => false, 'error' => 'Invalid id'], 400);
    $pdo->prepare('DELETE FROM tasks WHERE id=? AND user_id=?')->execute([$id,$user['id']]);
    json_out(['ok' => true]);
}

// ── Grade Components ──────────────────────────────────────────

function action_component_add(PDO $pdo, array $input): void {
    $user  = require_auth($pdo);
    require_academic($user); // Must be in a batch
    $eid   = (int)($input['enrollmentId'] ?? 0);
    $cid   = (int)($input['courseId'] ?? 0);
    $type  = trim((string)($input['type'] ?? 'other'));
    $name  = trim((string)($input['name'] ?? ''));
    $max   = is_numeric($input['maxMarks'] ?? null) ? (float)$input['maxMarks'] : null;
    $got   = is_numeric($input['obtained'] ?? null) ? (float)$input['obtained'] : null;
    
    if ($eid < 1 || $cid < 1 || $name === '' || $max === null || $got === null) 
        json_out(['ok' => false, 'error' => 'Invalid data'], 400);
    if ($got > $max) json_out(['ok' => false, 'error' => 'Obtained cannot exceed maximum'], 400);
    
    $st = $pdo->prepare('SELECT id FROM student_enrollments WHERE id=? AND user_id=? AND course_id=?');
    $st->execute([$eid, $user['id'], $cid]);
    if (!$st->fetch()) json_out(['ok' => false, 'error' => 'Enrollment not found'], 404);
    
    $valid = ['attendance','ct','quiz','assignment','midterm','final','presentation','other'];
    if (!in_array($type, $valid, true)) $type = 'other';
    
    try {
        $pdo->prepare('INSERT INTO grade_components (enrollment_id, course_id, type, name, max_marks, obtained) VALUES (?,?,?,?,?,?)')
            ->execute([$eid, $cid, $type, $name, $max, $got]);
        json_out(['ok' => true, 'component' => ['id' => (int)$pdo->lastInsertId(), 'enrollmentId' => $eid, 'courseId' => $cid, 'type' => $type, 'name' => $name, 'maxMarks' => $max, 'obtained' => $got]]);
    } catch (PDOException $e) {
        if ((int)$e->errorInfo[1] === 1062) json_out(['ok' => false, 'error' => 'A component with this name already exists for this course'], 409);
        throw $e;
    }
}

function action_component_update(PDO $pdo, array $input): void {
    $user  = require_auth($pdo);
    $cid   = (int)($input['componentId']  ?? 0);
    $eid   = (int)($input['enrollmentId'] ?? 0);
    $type  = trim((string)($input['type'] ?? 'other'));
    $name  = trim((string)($input['name'] ?? ''));
    $max   = is_numeric($input['maxMarks'] ?? null) ? (float)$input['maxMarks'] : null;
    $got   = is_numeric($input['obtained'] ?? null) ? (float)$input['obtained'] : null;
    
    if ($cid < 1 || $eid < 1 || $name === '' || $max === null || $got === null) json_out(['ok' => false, 'error' => 'Invalid data'], 400);
    if ($got > $max) json_out(['ok' => false, 'error' => 'Obtained cannot exceed maximum'], 400);
    
    $valid = ['attendance','ct','quiz','assignment','midterm','final','presentation','other'];
    if (!in_array($type, $valid, true)) $type = 'other';
    
    try {
        $st = $pdo->prepare(
            'UPDATE grade_components g
             INNER JOIN student_enrollments e ON g.enrollment_id = e.id
             SET g.type=?, g.name=?, g.max_marks=?, g.obtained=?
             WHERE g.id=? AND g.enrollment_id=? AND e.user_id=?'
        );
        $st->execute([$type,$name,$max,$got,$cid,$eid,$user['id']]);
        if ($st->rowCount() === 0) json_out(['ok' => false, 'error' => 'Not found'], 404);
        json_out(['ok' => true]);
    } catch (PDOException $e) {
        if ((int)$e->errorInfo[1] === 1062) json_out(['ok' => false, 'error' => 'A component with this name already exists for this course'], 409);
        throw $e;
    }
}

function action_component_delete(PDO $pdo, array $input): void {
    $user = require_auth($pdo);
    $cid  = (int)($input['componentId']  ?? 0);
    $eid  = (int)($input['enrollmentId'] ?? 0);
    if ($cid < 1 || $eid < 1) json_out(['ok' => false, 'error' => 'Invalid id'], 400);
    $pdo->prepare(
        'DELETE g FROM grade_components g
         INNER JOIN student_enrollments e ON g.enrollment_id = e.id
         WHERE g.id=? AND g.enrollment_id=? AND e.user_id=?'
    )->execute([$cid,$eid,$user['id']]);
    json_out(['ok' => true]);
}

// ── Batch Joining Flow ────────────────────────────────────────

function action_institutions_list(PDO $pdo, array $input): void {
    // Public/Auth independent. Used for dropdowns during joining.
    $st = $pdo->query('SELECT uni_code, uni_name FROM universities ORDER BY uni_name');
    $unis = $st->fetchAll();
    
    $st = $pdo->query('SELECT dept_id, dept_code, dept_name, uni_code FROM departments ORDER BY dept_name');
    $depts = $st->fetchAll();
    
    $st = $pdo->query('SELECT batch_id, batch_name, dept_id FROM batches ORDER BY batch_name DESC');
    $batches = $st->fetchAll();
    
    json_out(['ok' => true, 'universities' => $unis, 'departments' => $depts, 'batches' => $batches]);
}

function action_batch_join_request(PDO $pdo, array $input): void {
    $user = require_auth($pdo);
    $batchId = (int)($input['batchId'] ?? 0);
    $regNo   = trim((string)($input['regNo'] ?? ''));
    $msg     = trim((string)($input['message'] ?? '')) ?: null;
    
    if ($batchId < 1 || $regNo === '') json_out(['ok' => false, 'error' => 'Batch and Registration Number are required'], 400);
    
    // Check if user already has academic info
    if ($user['batch_id']) json_out(['ok' => false, 'error' => 'You are already in a batch'], 400);
    
    try {
        $pdo->prepare('INSERT INTO batch_join_requests (user_id, batch_id, reg_no, message) VALUES (?,?,?,?)')
            ->execute([$user['id'], $batchId, $regNo, $msg]);
        json_out(['ok' => true, 'message' => 'Request sent. Please wait for CR approval.']);
    } catch (PDOException $e) {
        if ((int)$e->errorInfo[1] === 1062) json_out(['ok' => false, 'error' => 'You already have a pending request for this batch'], 409);
        throw $e;
    }
}
