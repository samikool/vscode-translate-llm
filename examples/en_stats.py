# A simple script to calculate basic statistics on a list of numbers

# Define a list of sample numbers
numbers = [4, 8, 15, 16, 23, 42]

# Calculate the total sum of all numbers
total = sum(numbers)

average = total / len(numbers)  # Calculate the average by dividing sum by count

minimum = min(numbers)  # Smallest value in the list
maximum = max(numbers)  # Largest value in the list

# Print the results to the console
print(f"Numbers: {numbers}")
print(f"Sum:     {total}")
print(f"Average: {average:.2f}")
print(f"Min:     {minimum}")
print(f"Max:     {maximum}")
