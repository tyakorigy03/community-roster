import os
import re

def replace_in_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Replace Tailwind screen classes
    new_content = content.replace('min-h-screen', 'min-h-dvh')
    new_content = new_content.replace('h-screen', 'h-dvh')
    new_content = new_content.replace('max-h-screen', 'max-h-dvh')
    
    # 2. Replace arbitrary values like [90vh] with [90dvh]
    # This specifically looks for digits followed by vh inside square brackets or followed by a non-alphanumeric char
    new_content = re.sub(r'(\d+)vh(?=[\]\s\'"`;])', r'\1dvh', new_content)
    
    # 3. Handle cases like h-[calc(90vh-200px)]
    new_content = re.sub(r'(\d+)vh(?=[-\+\/\*\s\)])', r'\1dvh', new_content)

    if content != new_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated: {file_path}")

def main():
    src_dir = r'c:\Users\Hp\Documents\ny\communityroster\community-roster\src'
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file.endswith(('.jsx', '.tsx', '.css', '.html')):
                replace_in_file(os.path.join(root, file))

if __name__ == "__main__":
    main()
