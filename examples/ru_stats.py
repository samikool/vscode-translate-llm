# This file contains statistics functions written with Russian comments
# Простой скрипт для вычисления базовой статистики списка чисел

# Определяем список примерных чисел
numbers = [4, 8, 15, 16, 23, 42]

# Вычисляем общую сумму всех чисел
total = sum(numbers)

average = total / len(numbers)  # Вычисляем среднее значение, разделив сумму на количество элементов

minimum = min(numbers)  # Находим наименьшее значение в списке
maximum = max(numbers)  # Находим наибольшее значение в списке

# Выводим результаты на консоль
print(f"Numbers: {numbers}")
print(f"Sum:     {total}")
print(f"Average: {average:.2f}")
print(f"Min:     {minimum}")
print(f"Max:     {maximum}")
