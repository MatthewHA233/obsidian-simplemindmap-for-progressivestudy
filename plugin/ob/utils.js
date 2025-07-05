//  极简的深拷贝
export const simpleDeepClone = data => {
  try {
    return JSON.parse(JSON.stringify(data))
  } catch (error) {
    return null
  }
}

export const generateRandomString = (
  length = 12,
  charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
) => {
  // 参数验证
  if (typeof length !== 'number' || length <= 0) {
    throw new Error('长度必须是正整数')
  }
  if (typeof charSet !== 'string' || charSet.length === 0) {
    throw new Error('字符集不能为空')
  }

  // 使用加密安全的随机数生成器（如果可用）
  let randomValues
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    randomValues = new Uint32Array(length)
    crypto.getRandomValues(randomValues)
  } else {
    randomValues = new Array(length)
      .fill(0)
      .map(() => Math.random() * 0x100000000)
  }

  // 生成随机字符串
  let result = ''
  for (let i = 0; i < length; i++) {
    const randomIndex = randomValues[i] % charSet.length
    result += charSet.charAt(randomIndex)
  }

  return result
}

export const hideTargetMenu = (menu, text = '在新窗口中打开') => {
  // 隐藏特定默认菜单项
  menu.items.forEach(item => {
    // 通过菜单项标题或ID识别要隐藏的项
    if (item.title === text || item.dom?.innerText?.includes(text)) {
      item.dom.hide()
    }
  })
}

export const dataURItoBlob = dataURI => {
  const byteString = atob(dataURI.split(',')[1])
  const mimeString = dataURI
    .split(',')[0]
    .split(':')[1]
    .split(';')[0]
  const ab = new ArrayBuffer(byteString.length)
  const ia = new Uint8Array(ab)
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i)
  }
  return new Blob([ab], { type: mimeString })
}
