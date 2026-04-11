# This file contains statistics functions written with Chinese comments
# 一个简单的脚本，用于计算数字列表的基本统计信息

# 定义一个示例数字列表
numbers = [4, 8, 15, 16, 23, 42]

# 计算所有数字的总和
total = sum(numbers)

average = total / len(numbers)  # 通过将总和除以数量来计算平均值

minimum = min(numbers)  # 找出列表中的最小值
maximum = max(numbers)  # 找出列表中的最大值

# 将结果打印到控制台
print(f"Numbers: {numbers}")
print(f"Sum:     {total}")
print(f"Average: {average:.2f}")
print(f"Min:     {minimum}")
print(f"Max:     {maximum}")
