// इस फ़ाइल में हिंदी टिप्पणियों के साथ सांख्यिकीय फ़ंक्शन हैं

/* ------ डेटा परिभाषा ------ */
let numbers = [4, 8, 15, 16, 23, 42] /* नमूना संख्याओं की सूची */

// सभी संख्याओं का योग गणना करें
func sum(_ arr: [Int]) -> Int {
    return arr.reduce(0, +) // reduce का उपयोग करके योग निकालें
}

// सूची में न्यूनतम मान खोजें
func minimum(_ arr: [Int]) -> Int {
    return arr.min()! /* सबसे छोटा मान लौटाएं */
}

// सूची में अधिकतम मान खोजें
func maximum(_ arr: [Int]) -> Int {
    return arr.max()! /* सबसे बड़ा मान लौटाएं */
}

/*
 * मुख्य प्रविष्टि बिंदु।
 * बुनियादी सांख्यिकी की गणना और प्रदर्शन करें।
 */
let total = sum(numbers)
let average = Double(total) / Double(numbers.count) // औसत की गणना करें

/* ------ परिणाम प्रदर्शित करें ------ */
print("संख्याएं: \(numbers)")
print("योग:      \(total)")
print("औसत:     \(String(format: "%.2f", average))")
print("न्यूनतम:  \(minimum(numbers))")
print("अधिकतम:  \(maximum(numbers))")
