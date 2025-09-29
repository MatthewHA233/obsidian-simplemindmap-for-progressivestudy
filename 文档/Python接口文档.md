# Python 修改 .smm 文件接口文档

## .smm 文件实际格式

### 文件结构（Markdown格式）
.smm 文件实际是 Markdown 格式，包含 YAML frontmatter 和代码块：

```markdown
---
path: 文件路径
tags:
  - simple-mind-map
---

# metadata
```metadata
<LZ-String压缩的Base64数据>
```

# svgdata
```svgData
<LZ-String压缩的SVG数据>
```

# linkdata
- 链接1
- 链接2

# textdata
节点文本内容...
```

### 关键编解码信息
- **压缩库**: `lz-string`
- **压缩方法**: `LZString.compressToBase64(content)`
- **解压方法**: `LZString.decompressFromBase64(content)`
- **压缩内容**: metadata 部分的 JSON 数据

## 解码后的 JSON 数据结构

### 完整数据格式
```json
{
  "layout": "logicalStructure",
  "root": {
    "data": {
      "text": "根节点",
      "cardNotes": [],
      "dailyActivity": {}
    },
    "children": []
  },
  "theme": {
    "template": "default",
    "config": {}
  },
  "view": {
    "transform": {
      "scaleX": 1,
      "scaleY": 1,
      "shear": 0,
      "rotate": 0,
      "translateX": 0,
      "translateY": 0,
      "originX": 0,
      "originY": 0,
      "a": 1,
      "b": 0,
      "c": 0,
      "d": 1,
      "e": 0,
      "f": 0
    }
  }
}
```

### 节点数据结构
```json
{
  "data": {
    "text": "节点文本",
    "cardNotes": [
      {
        "path": "项目语境/2025-01/15-学习笔记.md",
        "basename": "15-学习笔记",
        "addedAt": "2025-01-15"
      }
    ],
    "dailyActivity": {
      "2025-01-15": {
        "cardLinksAdded": 3,
        "masteryTriggered": true,
        "isFirstMastery": true
      }
    }
  },
  "children": []
}
```

## Python 操作指南

### 0. 安装依赖
```bash
pip install lz4
# 或者使用纯Python实现
# pip install backports.lzma
```

### 1. 文件读写和编解码

```python
import re
import json
import base64
import lz4.frame  # 或使用其他LZ压缩库

def parse_smm_file(file_path):
    """解析.smm文件，返回解码后的数据"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 提取metadata部分的压缩数据
    metadata_match = re.search(r'```metadata\n(.*?)\n```', content, re.DOTALL)
    if not metadata_match:
        raise ValueError("无法找到metadata部分")

    compressed_data = metadata_match.group(1).strip()

    # LZ-String解压缩（需要JavaScript兼容的实现）
    # 注意：Python需要使用兼容lz-string的库
    try:
        # 这里需要使用lz-string的Python实现
        # 可以使用 lzstring 包: pip install lzstring
        import lzstring
        decompressed = lzstring.LZString().decompressFromBase64(compressed_data)
        return json.loads(decompressed)
    except ImportError:
        print("请安装lzstring包: pip install lzstring")
        return None

def save_smm_file(file_path, data):
    """保存数据到.smm文件"""
    import lzstring

    # 压缩JSON数据
    json_str = json.dumps(data, ensure_ascii=False)
    compressed = lzstring.LZString().compressToBase64(json_str)

    # 读取原文件
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 替换metadata部分
    new_content = re.sub(
        r'(```metadata\n).*?(\n```)',
        f'\\1{compressed}\\2',
        content,
        flags=re.DOTALL
    )

    # 保存文件
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)

# 使用示例
data = parse_smm_file("思维导图.smm")
# 修改数据...
save_smm_file("思维导图.smm", data)
```

### 2. 节点定位

#### 按文本查找
```python
def find_node_by_text(data, target_text):
    def search(node):
        if node.get('data', {}).get('text') == target_text:
            return node
        for child in node.get('children', []):
            result = search(child)
            if result:
                return result
        return None
    return search(data['root'])
```

#### 按路径查找
```python
def find_node_by_path(data, path_list):
    node = data['root']
    for text in path_list:
        found = False
        for child in node.get('children', []):
            if child.get('data', {}).get('text') == text:
                node = child
                found = True
                break
        if not found:
            return None
    return node
```

### 2. 卡片操作

#### 添加卡片到节点
```python
def add_card_to_node(node, card_path, card_basename):
    today = datetime.now().strftime('%Y-%m-%d')

    # 初始化数据结构
    if 'data' not in node:
        node['data'] = {}
    if 'cardNotes' not in node['data']:
        node['data']['cardNotes'] = []
    if 'dailyActivity' not in node['data']:
        node['data']['dailyActivity'] = {}

    # 添加卡片
    card_info = {
        "path": card_path,
        "basename": card_basename,
        "addedAt": today
    }
    node['data']['cardNotes'].append(card_info)

    # 更新每日活动
    if today not in node['data']['dailyActivity']:
        node['data']['dailyActivity'][today] = {
            "cardLinksAdded": 0,
            "masteryTriggered": False,
            "isFirstMastery": False
        }

    node['data']['dailyActivity'][today]['cardLinksAdded'] = len(node['data']['cardNotes'])

    # 检查掌握状态
    check_mastery(node, today)

def check_mastery(node, today):
    activity = node['data']['dailyActivity']
    today_cards = activity[today]['cardLinksAdded']

    # 检查是否有历史掌握记录
    has_previous_mastery = any(
        day_data.get('masteryTriggered', False)
        for day_data in activity.values()
    )

    # 掌握逻辑
    if not has_previous_mastery and today_cards >= 3:
        # 首次学习：≥3张卡片
        activity[today]['masteryTriggered'] = True
        activity[today]['isFirstMastery'] = True
    elif has_previous_mastery and today_cards >= 1:
        # 复习：≥1张卡片
        activity[today]['masteryTriggered'] = True
        activity[today]['isFirstMastery'] = False
```

### 3. 节点操作

#### 创建新节点
```python
def create_node(text):
    return {
        "data": {
            "text": text,
            "cardNotes": [],
            "dailyActivity": {}
        },
        "children": []
    }

def add_child_node(parent_node, child_text):
    child = create_node(child_text)
    if 'children' not in parent_node:
        parent_node['children'] = []
    parent_node['children'].append(child)
    return child
```

### 4. 完整操作示例

```python
import json
from datetime import datetime
import lzstring

def modify_smm_file(file_path, operations):
    # 解析.smm文件
    data = parse_smm_file(file_path)
    if not data:
        return

    for op in operations:
        if op['action'] == 'add_card':
            node = find_node_by_path(data, op['node_path'])
            if node:
                add_card_to_node(node, op['card_path'], op['card_basename'])

        elif op['action'] == 'create_node':
            parent = find_node_by_path(data, op['parent_path'])
            if parent:
                add_child_node(parent, op['node_text'])

    # 保存.smm文件
    save_smm_file(file_path, data)

# 使用示例
operations = [
    {
        "action": "add_card",
        "node_path": ["根节点", "子节点1"],
        "card_path": "项目语境/2025-09/27-学习笔记.md",
        "card_basename": "27-学习笔记"
    },
    {
        "action": "create_node",
        "parent_path": ["根节点"],
        "node_text": "新节点"
    }
]

modify_smm_file("思维导图.smm", operations)
```

## 关键数据字段

### cardNotes 结构
- `path`: 完整文件路径
- `basename`: 文件名（不含扩展名）
- `addedAt`: 添加日期（YYYY-MM-DD格式）

### dailyActivity 结构
- `cardLinksAdded`: 当天卡片总数
- `masteryTriggered`: 是否触发掌握（布尔值）
- `isFirstMastery`: 是否首次掌握（布尔值）

### 掌握逻辑
- 首次学习：当天添加 ≥3 张卡片 → 自动标记掌握
- 复习学习：当天添加 ≥1 张卡片 → 自动标记掌握

## 注意事项

1. **安装依赖**: 必须安装 `lzstring` 包：`pip install lzstring`
2. **文件格式**: .smm 文件是 Markdown 格式，不是纯 JSON
3. **压缩解压**: metadata 部分使用 LZ-String Base64 压缩
4. **修改前备份**: 务必备份原文件
5. **日期格式**: 统一使用 `YYYY-MM-DD`
6. **节点路径**: 数组按层级顺序
7. **卡片路径**: 使用相对于仓库根目录的路径
8. **编码格式**: 文件使用 UTF-8 编码

## 依赖安装

```bash
# 安装Python的lz-string兼容库
pip install lzstring

# 验证安装
python -c "import lzstring; print('lzstring安装成功')"
```