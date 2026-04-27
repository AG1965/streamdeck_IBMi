<?php
$system = $_REQUEST['system'] ?? 'none';
$system = strtolower($system);

$response = [];
$jobs_in_msgw = [];
if (rand(00, 99) > 75) {
    $jobs_in_msgw[] = [ 'JOB' => '123456/QSYSOPR/MYJOB' ];
}
if (rand(00, 99) > 75) {
    $jobs_in_msgw[] = [ 'JOB' => '987654/JOHNDOE/BADJOB' ];
}

if ('a' == $system) {
    $response = [
        'LPAR' => 'MYLPAR01',
        'ASP_USED' => rand(50,90) . '.' . rand(00,99),
        'JOBS_IN_MSGW' => $jobs_in_msgw
    ];
} elseif ('b' == $system) {
    $response = [
        'LPAR' => 'MYLPAR02',
        'ASP_USED' => rand(65,98) . '.' . rand(00,99),
        'JOBS_IN_MSGW' => $jobs_in_msgw
    ];
} else {
    $response = [
        'error' => 'Invalid system specified. Please use "a" or "b".'
    ];
}

header('Content-Type: application/json');
echo json_encode($response);

?>