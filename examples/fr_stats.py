# This file contains statistics functions written with French comments
# Un script simple pour calculer des statistiques de base sur une liste de nombres

# Définir une liste de nombres exemples
numbers = [4, 8, 15, 16, 23, 42]

# Calculer la somme totale de tous les nombres
total = sum(numbers)

average = total / len(numbers)  # Calculer la moyenne en divisant la somme par le nombre d'éléments

minimum = min(numbers)  # Trouver la valeur minimale dans la liste
maximum = max(numbers)  # Trouver la valeur maximale dans la liste

# Afficher les résultats dans la console
print(f"Numbers: {numbers}")
print(f"Sum:     {total}")
print(f"Average: {average:.2f}")
print(f"Min:     {minimum}")
print(f"Max:     {maximum}")
