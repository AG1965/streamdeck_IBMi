<?php
// This is a mockup of the actual IBM i webservice that provides system ASP usage and a list of jobs in message wait. 
// It is used for testing the Stream Deck plugin and there is absolutely no use for it in production.
$system = $_REQUEST['system'] ?? 'none';
$system = strtolower($system);

// randomly decide if there are any jobs in message wait, and if so, add one or two fake jobs to the response.
$jobs_in_msgw = [];
if (rand(00, 99) > 75) {
    $jobs_in_msgw[] = [ 'JOB' => '123456/QSYSOPR/MYJOB' ];
}
if (rand(00, 99) > 75) {
    $jobs_in_msgw[] = [ 'JOB' => '987654/JOHNDOE/BADJOB' ];
}


$response = [];

// invent a LPAR name based on the system name, and a random ASP usage percentage between 50 and 95.
$response['LPAR'] = 'MYLPAR' . strtoupper($system);
$response['ASP_USED'] =  rand(50,95) . '.' . rand(00,99);
$response['JOBS_IN_MSGW'] = $jobs_in_msgw;

header('Content-Type: application/json');
echo json_encode($response);

?>