<?php
declare(strict_types=1);

function json_out(array $data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function read_json_input(): array {
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') return [];
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function require_auth(PDO $pdo): array {
    $uid = $_SESSION['user_id'] ?? null;
    if (!$uid) json_out(['ok' => false, 'error' => 'Not signed in'], 401);
    
    // Fetch base user + personal info + academic info (if any)
    $st = $pdo->prepare(
        'SELECT u.id, u.email, u.role, u.is_active, 
                p.name, p.avatar_url,
                a.batch_id, a.dept_id, a.reg_no
         FROM users u
         LEFT JOIN personal_info p ON p.user_id = u.id
         LEFT JOIN academic_info a ON a.user_id = u.id
         WHERE u.id = ? AND u.deleted_at IS NULL'
    );
    $st->execute([(int)$uid]);
    $user = $st->fetch();
    
    if (!$user) { 
        $_SESSION = []; 
        json_out(['ok' => false, 'error' => 'Session invalid'], 401); 
    }
    if (!(int)$user['is_active']) json_out(['ok' => false, 'error' => 'Account disabled'], 403);
    
    $user['id']       = (int)$user['id'];
    $user['name']     = $user['name'] ?? $user['email'];
    $user['batch_id'] = $user['batch_id'] ? (int)$user['batch_id'] : null;
    $user['dept_id']  = $user['dept_id'] ? (int)$user['dept_id'] : null;
    
    return $user;
}

function require_role(array $user, string ...$roles): void {
    if (!in_array($user['role'], $roles, true))
        json_out(['ok' => false, 'error' => 'Access denied'], 403);
}

function require_cr(array $user): void    { require_role($user, 'cr'); }
function require_admin(array $user): void  { require_role($user, 'admin'); }
function require_mod(array $user): void    { require_role($user, 'university_moderator', 'admin'); }

// Ensure the user actually has academic info (is part of a batch)
function require_academic(array $user): void {
    if (!$user['batch_id']) {
        json_out(['ok' => false, 'error' => 'You must join a batch first'], 403);
    }
}

function log_role_change(PDO $pdo, int $uid, ?string $old, string $new, int $by): void {
    $pdo->prepare(
        'INSERT INTO user_roles_history (user_id, old_role, new_role, assigned_by) VALUES (?,?,?,?)'
    )->execute([$uid, $old, $new, $by]);
}

function fetch_notices(PDO $pdo, ?int $batchId = null): array {
    $now = date('Y-m-d H:i:s');
    // For students/CRs, fetch only their batch notices.
    // For admins, fetch all (batchId = null).
    
    $sql = 'SELECT n.id, n.title, n.description, n.category, n.priority, n.posted_by AS postedBy,
                   n.batch_id AS batchId, n.is_pinned AS isPinned,
                   n.attachment_url AS attachmentUrl, n.expires_at AS expiresAt, n.posted_at AS postedAt,
                   b.batch_name AS batchName
            FROM notices n
            LEFT JOIN batches b ON b.batch_id = n.batch_id
            WHERE (n.expires_at IS NULL OR n.expires_at > ?)';
            
    $params = [$now];
    if ($batchId !== null) {
        $sql .= ' AND n.batch_id = ?';
        $params[] = $batchId;
    }
    
    $sql .= ' ORDER BY n.is_pinned DESC, n.posted_at DESC';
    
    $st = $pdo->prepare($sql);
    $st->execute($params);
    
    $out = [];
    foreach ($st->fetchAll() as $n) {
        $out[] = [
            'id'            => (int)$n['id'],
            'title'         => $n['title'],
            'description'   => $n['description'],
            'category'      => $n['category'],
            'priority'      => $n['priority'],
            'postedBy'      => $n['postedBy'],
            'batchId'       => (int)$n['batchId'],
            'batchName'     => $n['batchName'],
            'isPinned'      => (bool)(int)$n['isPinned'],
            'attachmentUrl' => $n['attachmentUrl'],
            'expiresAt'     => $n['expiresAt'],
            'postedAt'      => (new DateTimeImmutable((string)$n['postedAt']))->format('c'),
            'editing'       => false,
        ];
    }
    return $out;
}
