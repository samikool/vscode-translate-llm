// This file contains statistics functions written with German comments

/* ------ Datendefinition ------ */
const numbers = [4, 8, 15, 16, 23, 42]; /* Ein Array mit Beispielzahlen */

// Die Gesamtsumme aller Zahlen berechnen
const total = numbers.reduce((acc, n) => acc + n, 0);

const average = total / numbers.length; // Durchschnitt berechnen

const minimum = Math.min(...numbers); // Kleinsten Wert finden
const maximum = Math.max(...numbers); // Größten Wert finden

/*
 * Ergebnisse in der Konsole ausgeben.
 * Alle Werte werden formatiert dargestellt.
 */
/* ------ Ergebnisse ausgeben ------ */
console.log(`Zahlen:       ${numbers}`);
console.log(`Summe:        ${total}`);
console.log(`Durchschnitt: ${average.toFixed(2)}`);
console.log(`Minimum:      ${minimum}`);
console.log(`Maximum:      ${maximum}`);
