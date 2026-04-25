<?php
// ── Auth & Bootstrap actions ─────────────────────────────────

function action_session(PDO $pdo, array $input): void {
    if (empty($_SESSION['user_id'])) json_out(['ok' => true, 'user' => null]);
    $u = require_auth($pdo);
    json_out(['ok' => true, 'user' => [
        'id'       => $u['id'],
        'email'    => $u['email'],
        'role'     => $u['role'],
        'name'     => $u['name'],
        'batch_id' => $u['batch_id'],
        'dept_id'  => $u['dept_id']
    ]]);
}

function action_login(PDO $pdo, array $input): void {
    $email = trim((string)($input['email'] ?? ''));
    $pass  = (string)($input['password'] ?? '');
    if ($email === '' || $pass === '') json_out(['ok' => false, 'error' => 'Email and password required'], 400);
    
    $st = $pdo->prepare(
        'SELECT u.id, u.email, u.password_hash, u.role, u.is_active, p.name, a.batch_id, a.dept_id
         FROM users u 
         LEFT JOIN personal_info p ON p.user_id = u.id
         LEFT JOIN academic_info a ON a.user_id = u.id
         WHERE u.email = ? AND u.deleted_at IS NULL'
    );
    $st->execute([$email]);
    $row = $st->fetch();
    
    if (!$row || !password_verify($pass, $row['password_hash']))
        json_out(['ok' => false, 'error' => 'Invalid credentials'], 401);
    if (!(int)$row['is_active']) json_out(['ok' => false, 'error' => 'Account is disabled'], 403);
    
    session_regenerate_id(true);
    $_SESSION['user_id'] = (int)$row['id'];
    json_out(['ok' => true, 'user' => [
        'id'       => (int)$row['id'], 
        'email'    => $row['email'],
        'role'     => $row['role'], 
        'name'     => $row['name'] ?? $email,
        'batch_id' => $row['batch_id'] ? (int)$row['batch_id'] : null,
        'dept_id'  => $row['dept_id'] ? (int)$row['dept_id'] : null
    ]]);
}

function action_register(PDO $pdo, array $input): void {
    $email = trim((string)($input['email'] ?? ''));
    $pass  = (string)($input['password'] ?? '');
    $name  = trim((string)($input['name'] ?? ''));
    
    if ($email === '' || $pass === '') json_out(['ok' => false, 'error' => 'Please fill all fields'], 400);
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) json_out(['ok' => false, 'error' => 'Invalid email'], 400);
    if (strlen($pass) < 8) json_out(['ok' => false, 'error' => 'Password must be at least 8 characters'], 400);
    if ($name === '') $name = explode('@', $email)[0];
    
    $pdo->beginTransaction();
    try {
        $pdo->prepare('INSERT INTO users (email, password_hash, role) VALUES (?,?,?)')
            ->execute([$email, password_hash($pass, PASSWORD_DEFAULT), 'student']);
        $uid = (int)$pdo->lastInsertId();
        
        $pdo->prepare('INSERT INTO personal_info (user_id, name) VALUES (?,?)')
            ->execute([$uid, $name]);
            
        $pdo->commit();
    } catch (PDOException $e) {
        $pdo->rollBack();
        if ((int)$e->errorInfo[1] === 1062) json_out(['ok' => false, 'error' => 'Email already registered'], 409);
        throw $e;
    }
    json_out(['ok' => true, 'message' => 'Account created. You can sign in now.']);
}

function action_logout(): void {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], (bool)$p['secure'], (bool)$p['httponly']);
    }
    session_destroy();
    json_out(['ok' => true]);
}

function action_bootstrap(PDO $pdo, array $input): void {
    $user = require_auth($pdo);
    $uid  = $user['id'];

    // 1. Academic info & Limbo Status
    $st = $pdo->prepare(
        'SELECT a.dept_id AS deptId, a.batch_id AS batchId, a.reg_no AS regNo,
                u.uni_name AS uniName, u.uni_code AS uniCode, 
                d.dept_name AS deptName, d.dept_code AS deptCode, 
                b.batch_name AS batchName
         FROM academic_info a
         JOIN departments  d ON d.dept_id = a.dept_id
         JOIN universities u ON u.uni_code = d.uni_code
         JOIN batches      b ON b.batch_id  = a.batch_id
         WHERE a.user_id = ?'
    );
    $st->execute([$uid]);
    $academic = $st->fetch() ?: null;
    $batchId = $academic ? (int)$academic['batchId'] : null;

    // Check pending requests if no academic info
    $pendingRequest = null;
    if (!$academic) {
        $st = $pdo->prepare('SELECT id, batch_id AS batchId, status FROM batch_join_requests WHERE user_id = ? ORDER BY requested_at DESC LIMIT 1');
        $st->execute([$uid]);
        $req = $st->fetch();
        if ($req) {
            $pendingRequest = [
                'id' => (int)$req['id'],
                'batchId' => (int)$req['batchId'],
                'status' => $req['status']
            ];
        }
    }

    // 2. Tasks (Personal)
    $st = $pdo->prepare('SELECT id, name, done, priority, due_date AS dueDate FROM tasks WHERE user_id = ? ORDER BY due_date ASC, id ASC');
    $st->execute([$uid]);
    $tasks = array_map(fn($r) => [
        'id' => (int)$r['id'], 
        'name' => $r['name'], 
        'done' => (bool)(int)$r['done'], 
        'priority' => $r['priority'], 
        'dueDate' => $r['dueDate']
    ], $st->fetchAll());

    // Initialize arrays that require academic info
    $exams = [];
    $enrollments = [];
    $courseFiles = [];

    if ($academic) {
        // 3. Enrollments + grade components
        $st = $pdo->prepare(
            'SELECT e.id AS enrollId, e.course_id AS courseId,
                    c.course_code AS code, c.course_name AS title, c.credit_hours AS creditHours
             FROM student_enrollments e
             JOIN courses c ON c.course_id = e.course_id
             WHERE e.user_id = ? AND e.batch_id = ?
             ORDER BY e.id ASC'
        );
        $st->execute([$uid, $batchId]);
        
        foreach ($st->fetchAll() as $row) {
            $eid = (int)$row['enrollId'];
            $st2 = $pdo->prepare('SELECT id, course_id AS courseId, type, name, max_marks AS maxMarks, obtained FROM grade_components WHERE enrollment_id = ? ORDER BY id ASC');
            $st2->execute([$eid]);
            $comps = array_map(fn($g) => [
                'id' => (int)$g['id'], 
                'courseId' => (int)$g['courseId'],
                'type' => $g['type'], 
                'name' => $g['name'], 
                'maxMarks' => (float)$g['maxMarks'], 
                'obtained' => (float)$g['obtained']
            ], $st2->fetchAll());
            
            $enrollments[] = [
                'enrollId' => $eid, 
                'courseId' => (int)$row['courseId'], 
                'code' => $row['code'], 
                'title' => $row['title'], 
                'creditHours' => (float)$row['creditHours'], 
                'components' => $comps
            ];
        }
        
        // 4. Exams (CR controlled, course+batch scoped)
        $st = $pdo->prepare(
            'SELECT ex.id, ex.course_id AS courseId, ex.name, ex.exam_date AS date, ex.exam_time AS time, ex.venue, ex.notes, c.course_code AS courseCode
             FROM exams ex
             JOIN courses c ON c.course_id = ex.course_id
             JOIN student_enrollments e ON e.course_id = ex.course_id AND e.batch_id = ex.batch_id
             WHERE e.user_id = ? AND ex.batch_id = ?
             ORDER BY ex.exam_date ASC'
        );
        $st->execute([$uid, $batchId]);
        $exams = array_map(fn($r) => [
            'id' => (int)$r['id'], 
            'courseId' => (int)$r['courseId'],
            'courseCode' => $r['courseCode'],
            'name' => $r['name'], 
            'date' => $r['date'], 
            'time' => $r['time'], 
            'venue' => $r['venue'], 
            'notes' => $r['notes']
        ], $st->fetchAll());
        
        // 5. Course Files (CR uploaded)
        $st = $pdo->prepare(
            'SELECT cf.id, cf.course_id AS courseId, cf.file_url AS url, cf.file_name AS name, cf.file_type AS type, cf.uploaded_at AS uploadedAt
             FROM course_files cf
             JOIN student_enrollments e ON e.course_id = cf.course_id
             WHERE e.user_id = ? AND e.batch_id = ?
             ORDER BY cf.uploaded_at DESC'
        );
        $st->execute([$uid, $batchId]);
        $courseFiles = array_map(fn($r) => [
            'id' => (int)$r['id'],
            'courseId' => (int)$r['courseId'],
            'url' => $r['url'],
            'name' => $r['name'],
            'type' => $r['type'],
            'uploadedAt' => (new DateTimeImmutable((string)$r['uploadedAt']))->format('c')
        ], $st->fetchAll());
    }

    json_out([
        'ok' => true, 
        'user' => [
            'id' => $uid, 
            'email' => $user['email'], 
            'role' => $user['role'], 
            'name' => $user['name']
        ], 
        'academic' => $academic, 
        'pendingRequest' => $pendingRequest,
        'exams' => $exams, 
        'tasks' => $tasks, 
        'enrollments' => $enrollments, 
        'courseFiles' => $courseFiles,
        'notices' => fetch_notices($pdo, $batchId)
    ]);
}
