<?php

declare(strict_types=1);

function studyease_config(): array
{
    $path = dirname(__DIR__) . '/config.php';
    if (!is_readable($path)) {
        throw new RuntimeException('Missing config.php. Copy config.example.php to config.php and set database credentials.');
    }
    $c = require $path;
    if (!is_array($c) || !isset($c['db'])) {
        throw new RuntimeException('Invalid config.php structure.');
    }
    return $c;
}

function studyease_pdo(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    $cfg = studyease_config()['db'];
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $cfg['host'],
        (int) $cfg['port'],
        $cfg['name'],
        $cfg['charset']
    );
    $pdo = new PDO($dsn, $cfg['user'], $cfg['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    return $pdo;
}
