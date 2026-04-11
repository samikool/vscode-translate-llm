# This file contains statistics functions written with German comments
# Ein einfaches Skript zur Berechnung grundlegender Statistiken einer Zahlenliste

# Eine Liste mit Beispielzahlen definieren
numbers = [4, 8, 15, 16, 23, 42]

# Die Gesamtsumme aller Zahlen berechnen
total = sum(numbers)

average = total / len(numbers)  # Den Durchschnitt berechnen, indem die Summe durch die Anzahl geteilt wird

minimum = min(numbers)  # Den kleinsten Wert in der Liste finden
maximum = max(numbers)  # Den größten Wert in der Liste finden

# Die Ergebnisse in der Konsole ausgeben
print(f"Numbers: {numbers}")
print(f"Sum:     {total}")
print(f"Average: {average:.2f}")
print(f"Min:     {minimum}")
print(f"Max:     {maximum}")

