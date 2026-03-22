const colors = [
  '红色', '橙色', '金色', '绿色', '青色',
  '蓝色', '紫色', '粉色', '白色', '灰色',
]

const animals = [
  '海豹', '狐狸', '熊猫', '企鹅', '猫头鹰',
  '海豚', '松鼠', '兔子', '考拉', '柴犬',
  '水獭', '刺猬', '鹦鹉', '浣熊', '树懒',
  '猫咪', '鲸鱼', '章鱼', '孔雀', '火烈鸟',
]

/**
 * Generate a random anonymous nickname like "紫色海豹"
 */
export function randomNickname(): string {
  const color = colors[Math.floor(Math.random() * colors.length)]
  const animal = animals[Math.floor(Math.random() * animals.length)]
  return `${color}${animal}`
}

/**
 * Generate a simple avatar color from nickname
 */
export function nicknameColor(nickname: string): string {
  let hash = 0
  for (let i = 0; i < nickname.length; i++) {
    hash = nickname.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 65%, 55%)`
}
