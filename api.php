<?php
declare(strict_types=1);

session_start();
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/includes/db.php';
require_once __DIR__ . '/includes/helpers.php';
require_once __DIR__ . '/includes/actions_auth.php';
require_once __DIR__ . '/includes/actions_student.php';
require_once __DIR__ . '/includes/actions_cr.php';
require_once __DIR__ . '/includes/actions_admin.php';

$input  = read_json_input();
$action = $input['action'] ?? ($_GET['action'] ?? '');

try {
    $pdo = studyease_pdo();
} catch (Throwable $e) {
    json_out(['ok' => false, 'error' => 'Database connection failed'], 500);
}

try {
    match ($action) {
        // ── Auth & Bootstrap ──────────────────────────────────
        'session'                 => action_session($pdo, $input),
        'login'                   => action_login($pdo, $input),
        'register'                => action_register($pdo, $input),
        'logout'                  => action_logout(),
        'bootstrap'               => action_bootstrap($pdo, $input),
        
        // ── Student Actions ───────────────────────────────────
        'institutions_list'       => action_institutions_list($pdo, $input),
        'batch_join_request'      => action_batch_join_request($pdo, $input),
        
        'task_add'                => action_task_add($pdo, $input),
        'task_toggle'             => action_task_toggle($pdo, $input),
        'task_delete'             => action_task_delete($pdo, $input),
        
        'component_add'           => action_component_add($pdo, $input),
        'component_update'        => action_component_update($pdo, $input),
        'component_delete'        => action_component_delete($pdo, $input),
        
        // ── CR Actions ────────────────────────────────────────
        'cr_requests_list'        => action_cr_requests_list($pdo, $input),
        'cr_request_review'       => action_cr_request_review($pdo, $input),
        'cr_course_add'           => action_cr_course_add($pdo, $input),
        'cr_exam_add'             => action_cr_exam_add($pdo, $input),
        'cr_file_upload'          => action_cr_file_upload($pdo, $input),
        
        // ── Notices (CR) ──────────────────────────────────────
        'notices_list'            => action_notices_list($pdo, $input),
        'notice_add'              => action_notice_add($pdo, $input),
        'notice_update'           => action_notice_update($pdo, $input),
        'notice_delete'           => action_notice_delete($pdo, $input),
        
        // ── Admin / Moderator ─────────────────────────────────
        'admin_overview'          => action_admin_overview($pdo, $input),
        'admin_user_details'      => action_admin_user_details($pdo, $input),
        'admin_user_role_update'  => action_admin_user_role_update($pdo, $input),
        'admin_user_delete'       => action_admin_user_delete($pdo, $input),
        'admin_university_add'    => action_admin_university_add($pdo, $input),
        'admin_university_update' => action_admin_university_update($pdo, $input),
        'admin_university_delete' => action_admin_university_delete($pdo, $input),
        'admin_department_add'    => action_admin_department_add($pdo, $input),
        'admin_department_update' => action_admin_department_update($pdo, $input),
        'admin_department_delete' => action_admin_department_delete($pdo, $input),
        'admin_batch_add'         => action_admin_batch_add($pdo, $input),
        'admin_batch_update'      => action_admin_batch_update($pdo, $input),
        'admin_batch_delete'      => action_admin_batch_delete($pdo, $input),
        'admin_course_add'        => action_admin_course_add($pdo, $input),
        'admin_course_update'     => action_admin_course_update($pdo, $input),
        'admin_course_delete'     => action_admin_course_delete($pdo, $input),
        'admin_notice_update'     => action_admin_notice_update($pdo, $input),
        'admin_notice_delete'     => action_admin_notice_delete($pdo, $input),
        
        default                   => json_out(['ok' => false, 'error' => 'Unknown action'], 400),
    };
} catch (Throwable $e) {
    // For dev, might want to output $e->getMessage() but keep it secure in prod
    json_out(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
