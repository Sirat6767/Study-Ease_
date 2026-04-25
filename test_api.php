<?php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'http://localhost:8000/api.php');
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['action'=>'login','email'=>'admin@studyease.com','password'=>'1234']));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_COOKIEJAR, 'cookie.txt');
curl_setopt($ch, CURLOPT_COOKIEFILE, 'cookie.txt');
$res = curl_exec($ch);
echo 'Login: ' . $res . PHP_EOL;

curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['action'=>'admin_user_role_update','userId'=>14,'role'=>'university_moderator']));
$res2 = curl_exec($ch);
echo 'Update: ' . $res2 . PHP_EOL;
