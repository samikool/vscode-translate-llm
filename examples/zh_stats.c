/* This file contains statistics functions written with Chinese comments */

/* ------ 常量定义 ------ */
#define MAX_NUMBERS 6

/*
 * 计算整数数组的总和。
 * 返回所有元素的总和。
 */
int sum(int *arr, int n) {
    int total = 0; /* 初始化总和为零 */
    for (int i = 0; i < n; i++) {
        total += arr[i]; /* 将每个元素加到总和中 */
    }
    return total;
}

/* 查找数组中的最小值 */
int minimum(int *arr, int n) {
    int min = arr[0];
    for (int i = 1; i < n; i++) {
        if (arr[i] < min) { min = arr[i]; } /* 必要时更新最小值 */
    }
    return min;
}

/* 查找数组中的最大值 */
int maximum(int *arr, int n) {
    int max = arr[0];
    for (int i = 1; i < n; i++) {
        if (arr[i] > max) { max = arr[i]; } /* 必要时更新最大值 */
    }
    return max;
}

/*
 * 程序入口点。
 * 计算并输出基本统计信息。
 */
int main() {
    int numbers[] = {4, 8, 15, 16, 23, 42}; /* 示例数字数组 */
    int n = MAX_NUMBERS;

    /* ------ 输出结果 ------ */
    printf("Numbers: {4, 8, 15, 16, 23, 42}\n");
    printf("Sum:     %d\n",   sum(numbers, n));     /* 输出总和 */
    printf("Min:     %d\n",   minimum(numbers, n)); /* 输出最小值 */
    printf("Max:     %d\n",   maximum(numbers, n)); /* 输出最大值 */

    return 0; /* 程序成功结束 */
}
