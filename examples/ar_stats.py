# This file contains statistics functions written with Arabic comments
# سكريبت بسيط لحساب الإحصاءات الأساسية لقائمة من الأرقام

# تعريف قائمة من الأرقام النموذجية
numbers = [4, 8, 15, 16, 23, 42]

# حساب المجموع الكلي لجميع الأرقام
total = sum(numbers)

average = total / len(numbers)  # حساب المتوسط بقسمة المجموع على عدد العناصر

minimum = min(numbers)  # إيجاد أصغر قيمة في القائمة
maximum = max(numbers)  # إيجاد أكبر قيمة في القائمة

# طباعة النتائج على وحدة التحكم
print(f"Numbers: {numbers}")
print(f"Sum:     {total}")
print(f"Average: {average:.2f}")
print(f"Min:     {minimum}")
print(f"Max:     {maximum}")
