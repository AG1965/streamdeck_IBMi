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

$response['LPAR'] = 'MYLPAR' . strtoupper($system);
$response['ASP_USED'] =  rand(50,95) . '.' . rand(00,99);
$response['JOBS_IN_MSGW'] = $jobs_in_msgw;

header('Content-Type: application/json');
echo json_encode($response);

?>