// This file contains statistics functions written with French comments

/**
 * Calcule les statistiques de base d'une liste de nombres.
 * Affiche la somme, la moyenne, le minimum et le maximum.
 */
public class fr_stats {

    /** Calcule la somme de tous les éléments du tableau */
    static int sum(int[] arr) {
        int total = 0; // Valeur initiale de la somme
        for (int n : arr) {
            total += n; // Ajouter chaque élément à la somme
        }
        return total;
    }

    /** Trouve la valeur minimale dans le tableau */
    static int minimum(int[] arr) {
        int min = arr[0];
        for (int n : arr) {
            if (n < min) { min = n; } // Mettre à jour le minimum si nécessaire
        }
        return min;
    }

    /** Trouve la valeur maximale dans le tableau */
    static int maximum(int[] arr) {
        int max = arr[0];
        for (int n : arr) {
            if (n > max) { max = n; } // Mettre à jour le maximum si nécessaire
        }
        return max;
    }

    public static void main(String[] args) {
        /* ------ Définition des données ------ */
        int[] numbers = {4, 8, 15, 16, 23, 42}; // Tableau de nombres exemples

        int total = sum(numbers);
        double average = (double) total / numbers.length; // Diviser la somme par le nombre d'éléments

        double min = minimum(numbers); // Valeur minimale de la liste
        double max = maximum(numbers); // Valeur maximale de la liste

        /* ------ Affichage des résultats ------ */
        /*
         * Les résultats sont formatés pour la lisibilité.
         */
        System.out.println("Nombres: [4, 8, 15, 16, 23, 42]");
        System.out.printf("Somme:   %d%n",   total);
        System.out.printf("Moyenne: %.2f%n", average);
        System.out.printf("Valeur minimale: %.0f%n", min);
        System.out.printf("Valeur maximale: %.0f%n", max);
    }
}
