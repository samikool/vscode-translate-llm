// This file contains statistics functions written with Russian comments

/* ------ Определение данных ------ */
const numbers: number[] = [4, 8, 15, 16, 23, 42]; /* Массив примерных чисел */

// Вычисляем общую сумму всех чисел
const total: number = numbers.reduce((acc, n) => acc + n, 0);

const average: number = total / numbers.length; // Вычисляем среднее значение

const minimum: number = Math.min(...numbers); // Наименьшее значение в массиве
const maximum: number = Math.max(...numbers); // Наибольшее значение в массиве

/*
 * Выводим результаты на консоль.
 * Все значения отформатированы для удобства чтения.
 */
/* ------ Вывод результатов ------ */
console.log(`Числа:       ${numbers}`);
console.log(`Сумма:       ${total}`);
console.log(`Среднее:     ${average.toFixed(2)}`);
console.log(`Минимум:     ${minimum}`);
console.log(`Максимум:    ${maximum}`);
