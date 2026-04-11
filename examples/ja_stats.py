# This file contains statistics functions written with Japanese comments
# 数値リストの基本統計を計算するシンプルなスクリプト

# サンプル数値のリストを定義する
numbers = [4, 8, 15, 16, 23, 42]

# 全ての数値の合計を計算する
total = sum(numbers)

average = total / len(numbers)  # 合計を個数で割って平均値を計算する

minimum = min(numbers)  # リスト内の最小値を見つける
maximum = max(numbers)  # リスト内の最大値を見つける

# 結果をコンソールに出力する
print(f"Numbers: {numbers}")
print(f"Sum:     {total}")
print(f"Average: {average:.2f}")
print(f"Min:     {minimum}")
print(f"Max:     {maximum}")
