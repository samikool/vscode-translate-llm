// Questo file contiene funzioni statistiche con commenti in italiano
#include <iostream>
#include <vector>
#include <algorithm>
#include <numeric>

/* ------ Definizione dei dati ------ */
const std::vector<int> numeri = {4, 8, 15, 16, 23, 42}; /* Vettore di numeri di esempio */

// Calcola la somma di tutti gli elementi del vettore
int somma(const std::vector<int>& arr) {
    return std::accumulate(arr.begin(), arr.end(), 0); // Usa accumulate per sommare
}

// Trova il valore minimo nel vettore
int minimo(const std::vector<int>& arr) {
    return *std::min_element(arr.begin(), arr.end()); /* Restituisce il minimo */
}

// Trova il valore massimo nel vettore
int massimo(const std::vector<int>& arr) {
    return *std::max_element(arr.begin(), arr.end()); /* Restituisce il massimo */
}

/*
 * Punto di ingresso del programma.
 * Calcola e stampa le statistiche di base.
 */
int main() {
    int totale = somma(numeri);
    double media = static_cast<double>(totale) / numeri.size(); // Calcola la media

    /* ------ Stampa i risultati ------ */
    std::cout << "Numeri:  {4, 8, 15, 16, 23, 42}" << std::endl;
    std::cout << "Somma:   " << totale << std::endl;
    std::cout << "Media:   " << media << std::endl;
    std::cout << "Minimo:  " << minimo(numeri) << std::endl;
    std::cout << "Massimo: " << massimo(numeri) << std::endl;

    return 0; /* Programma terminato con successo */
}
