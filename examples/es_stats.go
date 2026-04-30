// This file contains statistics functions written with Spanish comments
package main

import "fmt"

/*
 * Funciones para calcular estadísticas básicas.
 * Operan sobre slices de enteros.
 */

/* ------ Funciones de cálculo ------ */

// Calcular la suma de todos los números en el slice
func sum(numbers []int) int {
	total := 0
	for _, n := range numbers {
		total += n // Añadir cada elemento al total
	}
	return total
}

// Encontrar el valor mínimo en el slice
func minimum(numbers []int) int {
	min := numbers[0] /* Valor inicial para la comparación */
	for _, n := range numbers[1:] {
		if n < min {
			min = n // Actualizar el mínimo si es necesario
		}
	}
	return min
}

// Encontrar el valor máximo en el slice
func maximum(numbers []int) int {
	max := numbers[0] /* Valor inicial para la comparación */
	for _, n := range numbers[1:] {
		if n > max {
			max = n // Actualizar el máximo si es necesario
		}
	}
	return max
}

func main() {
	// Definir una lista de números de ejemplo
	numbers := []int{4, 8, 15, 16, 23, 42}

	total := sum(numbers)
	average := float64(total) / float64(len(numbers)) // Calcular el promedio

	/* ------ Imprimir los resultados ------ */
	fmt.Printf("Numbers: %v\n",   numbers)
	fmt.Printf("Sum:     %d\n",   total)
	fmt.Printf("Average: %.2f\n", average)
	fmt.Printf("Min:     %d\n",   minimum(numbers))
	fmt.Printf("Max:     %d\n",   maximum(numbers))
}
