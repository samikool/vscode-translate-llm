# This file contains statistics functions written with Zulu comments
# Uhlelo olulula lokubala izibalo eziyisisekelo kuluhlu lwezinombolo

# Chaza uhlu lwezinombolo zesampula
numbers = [4, 8, 15, 16, 23, 42]

# Bala isamba sazo zonke izinombolo
total = sum(numbers)

average = total / len(numbers)  # Bala uphakathi nendawo ngokuhlukanisa isamba ngokubala kwazo

minimum = min(numbers)  # Thola inani elincane kuluhlu
maximum = max(numbers)  # Thola inani elikhulu kuluhlu

# Shicilela imiphumela kwi-console
print(f"Numbers: {numbers}")
print(f"Sum:     {total}")
print(f"Average: {average:.2f}")
print(f"Min:     {minimum}")
print(f"Max:     {maximum}")
