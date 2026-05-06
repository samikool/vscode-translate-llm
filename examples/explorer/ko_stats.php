<?php
// 이 파일은 한국어 주석으로 작성된 통계 함수를 포함합니다

/* ------ 데이터 정의 ------ */
$numbers = [4, 8, 15, 16, 23, 42]; /* 예제 숫자 배열 */

// 모든 숫자의 합계 계산
function sum(array $arr): int {
    $total = 0;
    foreach ($arr as $n) {
        $total += $n; // 각 요소를 합계에 추가
    }
    return $total;
}

// 배열에서 최솟값 찾기
function minimum(array $arr): int {
    $min = $arr[0];
    foreach ($arr as $n) {
        if ($n < $min) { $min = $n; } // 필요한 경우 최솟값 업데이트
    }
    return $min;
}

// 배열에서 최댓값 찾기
function maximum(array $arr): int {
    $max = $arr[0];
    foreach ($arr as $n) {
        if ($n > $max) { $max = $n; } // 필요한 경우 최댓값 업데이트
    }
    return $max;
}

/*
 * 결과를 출력합니다.
 * 모든 값은 형식에 맞게 표시됩니다.
 */
$total = sum($numbers);
$average = $total / count($numbers); // 평균 계산

/* ------ 결과 출력 ------ */
echo "숫자: " . implode(", ", $numbers) . "\n";
echo "합계: $total\n";
echo "평균: " . number_format($average, 2) . "\n";
echo "최솟값: " . minimum($numbers) . "\n";
echo "최댓값: " . maximum($numbers) . "\n";
