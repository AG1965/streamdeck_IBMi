<?php
$response   = [];

$DATABASE    = '';
$DB_USER     = '';
$DB_PASSWORD = '';

@$conn = db2_pconnect($DATABASE, $DB_USER, $DB_PASSWORD);	
if (!$conn) {
    $response['error'] = db2_conn_error().' '.db2_conn_errormsg() . ' connecting to database.';
}

$CONTENT_TYPE_JSON = 'application/json';

if (!isset($response['error'])) {

    // query the database for the ASP usage percentage, and add it to the response. 
    // If there is an error, add the error message to the response instead.
    $sql = 'SELECT SYSTEM_ASP_USED ASP_USED FROM QSYS2.SYSTEM_STATUS_INFO';

	$stmt = db2_prepare($conn, $sql);
	if (!$stmt) {
        $response['error'] = db2_stmt_error().' '.db2_stmt_errormsg() . ' in ' . $sql;
    } else {
        $result = db2_execute($stmt);
        if (!$result) {
            $response['error'] = db2_stmt_error().' '.db2_stmt_errormsg() . ' in ' . $sql;
        } else {
            $row = db2_fetch_assoc($stmt);
            if (!$row) {
                $response['error'] = db2_stmt_error().' '.db2_stmt_errormsg() . ' in ' . $sql;
            } else {
                $response['ASP_USED'] = $row['ASP_USED'];
            }
        }
    }
}

if (!isset($response['error'])) {
    // query the database for the jobs in message wait, and add them to the response.
    $sql = 'SELECT JOB_NAME FROM TABLE(QSYS2.ACTIVE_JOB_INFO()) WHERE JOB_STATUS = ?';

    $jobs_in_msgw = [];
    $stmt = db2_prepare($conn, $sql);
	if (!$stmt) {
        $response['error'] = db2_stmt_error().' '.db2_stmt_errormsg() . ' in ' . $sql;
    } else {
        $result = db2_execute($stmt, array('MSGW'));
        if (!$result) {
            $response['error'] = db2_stmt_error().' '.db2_stmt_errormsg() . ' in ' . $sql;
        } else {
            while ($row = db2_fetch_assoc($stmt)) {
                $jobs_in_msgw[] = $row;
            }
        }
    }
    $response['JOBS_IN_MSGW'] = $jobs_in_msgw;
}




header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

echo json_encode($response);

?>
