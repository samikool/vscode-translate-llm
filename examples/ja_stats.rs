// This file contains statistics functions written with Japanese comments

/*
 * 基本的な統計を計算する関数群。
 * i32スライスを入力として受け取る。
 */

/* ------ 計算関数 ------ */

// 整数スライスの合計を計算する
fn sum(numbers: &[i32]) -> i32 {
    numbers.iter().sum() // イテレータを使って合計を求める
}

// スライスの最小値を返す
fn minimum(numbers: &[i32]) -> i32 {
    *numbers.iter().min().unwrap() // 最小値を取得して参照を外す
}

// スライスの最大値を返す
fn maximum(numbers: &[i32]) -> i32 {
    *numbers.iter().max().unwrap() // 最大値を取得して参照を外す
}

fn main() {
    // サンプル数値の配列を定義する
    let numbers = [4, 8, 15, 16, 23, 42];

    let total = sum(&numbers); /* 合計を計算する */
    let average = total as f64 / numbers.len() as f64; // 平均値を計算する

    /* ------ 結果を出力する ------ */
    println!("Numbers: {:?}", numbers);
    println!("Sum:     {}", total);
    println!("Average: {:.2}", average);
    println!("Min:     {}", minimum(&numbers));
    println!("Max:     {}", maximum(&numbers));
}
