# This file contains statistics functions written with Spanish comments
# Un script simple para calcular estadísticas básicas de una lista de números

# Definir una lista de números de ejemplo
numbers = [4, 8, 15, 16, 23, 42]

# Calcular la suma total de todos los números
total = sum(numbers)

average = total / len(numbers)  # Calcular el promedio dividiendo la suma entre la cantidad de elementos

minimum = min(numbers)  # Encontrar el valor mínimo de la lista
maximum = max(numbers)  # Encontrar el valor máximo de la lista

# Imprimir los resultados en la consola
print(f"Numbers: {numbers}") 
print(f"Sum:     {total}")
print(f"Average: {average:.2f}")
print(f"Min:     {minimum}")
print(f"Max:     {maximum}")
