# This file contains statistics functions written with Zulu comments

# Chaza uhlu lwezinombolo zesampula
numbers = [4, 8, 15, 16, 23, 42]

# Bala isamba sazo zonke izinombolo
total = numbers.sum

average = total.to_f / numbers.length # Bala uphakathi nendawo

minimum = numbers.min # Thola inani elincane kuluhlu
maximum = numbers.max # Thola inani elikhulu kuluhlu

# Shicilela imiphumela
puts "Izinombolo: #{numbers}"
puts "Isamba:     #{total}"
puts "Uphakathi:  #{format('%.2f', average)}"
puts "Elincane:   #{minimum}"
puts "Elikhulu:   #{maximum}"
