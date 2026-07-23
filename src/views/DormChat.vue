<template>
  <div class="dorm-chat">
    <!-- 加载状态 -->
    <div v-if="loading" class="chat-loading">
      <div class="loading-spinner"></div>
      <span>{{ t('common.loading') }}</span>
    </div>

    <!-- 无宿舍信息 -->
    <div v-else-if="!roomInfo" class="chat-empty">
      <div class="empty-icon">💬</div>
      <p class="empty-title">{{ t('dormChat.noRoom') }}</p>
      <p v-if="errorMsg" class="empty-detail">{{ errorMsg }}</p>
    </div>

    <!-- 聊天界面 -->
    <template v-else>
      <!-- 头部 -->
      <div class="chat-header">
        <div class="chat-header-left">
          <h3 class="chat-room-name">{{ roomInfo.roomName }}</h3>
          <span class="chat-member-count">{{ roomInfo.members?.length }} {{ t('dormChat.members') }}</span>
        </div>
        <div class="chat-header-right">
          <span :class="['ws-status', wsStatus]">
            <span class="status-dot"></span>
            {{ wsStatusText }}
          </span>
        </div>
      </div>

      <!-- 消息列表 -->
      <div class="chat-messages" ref="messagesRef" @scroll="handleScroll">
        <div v-if="loadingMore" class="loading-more">{{ t('common.loading') }}</div>
        <div v-if="noMoreMessages && messages.length > 0" class="no-more">{{ t('dormChat.noMore') }}</div>
        <div v-if="messages.length === 0 && !loadingMore" class="no-messages">{{ t('dormChat.noMessages') }}</div>

        <div v-for="(msg, index) in messages" :key="msg.id ? msg.id : ('tmp-' + index)"
             :class="['message-item', getMessageClass(msg)]">
          <!-- 系统消息 -->
          <div v-if="msg.type === 'system'" class="system-message">
            <span>{{ msg.content }}</span>
            <span class="msg-time-small">{{ msg.time }}</span>
          </div>

          <!-- 用户消息 -->
          <div v-else class="user-message">
            <div class="message-avatar">
              <img v-if="msg.senderAvatar" :src="getAvatarUrl(msg.senderAvatar)" alt="">
              <span v-else>{{ (msg.sender || '?').charAt(0) }}</span>
            </div>
            <div class="message-body">
              <div class="message-meta">
                <span class="sender-name">{{ getMessageClass(msg) === 'is-self' ? '我' : msg.sender }}</span>
                <span class="msg-time">{{ msg.time }}</span>
              </div>
              <div class="message-content">
                <!-- 文本消息 -->
                <span v-if="msg.type === 'TEXT'" class="text-content">{{ msg.content }}</span>
                <!-- 表情消息 -->
                <span v-else-if="msg.type === 'EMOJI'" class="emoji-content">{{ msg.content }}</span>
                <!-- 图片消息 -->
                <img v-else-if="msg.type === 'IMAGE'" :src="getMediaUrl(msg.content)" class="image-content"
                     @click="previewImage(msg.content)" />
                <!-- 视频消息 -->
                <video v-else-if="msg.type === 'VIDEO'" :src="getMediaUrl(msg.content)"
                       class="video-content" controls preload="metadata"></video>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 表情选择器 -->
      <transition name="emoji-panel">
        <div v-if="showEmoji" class="emoji-panel">
          <div class="emoji-tabs">
            <button v-for="(cat, i) in emojiCategories" :key="i"
                    :class="['emoji-tab', { active: emojiTab === i }]"
                    @click="emojiTab = i">
              {{ cat.icon }}
            </button>
          </div>
          <div class="emoji-grid">
            <button v-for="emoji in emojiCategories[emojiTab].emojis" :key="emoji"
                    class="emoji-btn" @click="sendEmoji(emoji)">
              {{ emoji }}
            </button>
          </div>
        </div>
      </transition>

      <!-- 输入区域 -->
      <div class="chat-input-area">
        <div class="input-toolbar">
          <button class="toolbar-btn" :title="t('dormChat.emoji')" @click="showEmoji = !showEmoji">😀</button>
          <button class="toolbar-btn" :title="t('dormChat.image')" @click="triggerImageUpload">🖼️</button>
          <button class="toolbar-btn" :title="t('dormChat.video')" @click="triggerVideoUpload">🎬</button>
        </div>
        <div class="input-row">
          <input v-model="inputText" :placeholder="t('dormChat.placeholder')"
                 @keydown.enter.prevent="sendTextMessage" class="chat-input" />
          <button class="send-btn" @click="sendTextMessage" :disabled="!inputText.trim()">
            {{ t('dormChat.send') }}
          </button>
        </div>
      </div>

      <!-- 隐藏文件输入 -->
      <input type="file" ref="imageInputRef" accept="image/*" style="display:none" @change="handleImageUpload" />
      <input type="file" ref="videoInputRef" accept="video/*" style="display:none" @change="handleVideoUpload" />

      <!-- 图片预览 -->
      <div v-if="previewImageUrl" class="image-preview-overlay" @click="previewImageUrl = ''">
        <img :src="getMediaUrl(previewImageUrl)" />
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, onActivated, onDeactivated, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import axios from '../utils/request'

const { t } = useI18n()

const loading = ref(true)
const roomInfo = ref(null)
const errorMsg = ref('')
const messages = ref([])
const inputText = ref('')
const showEmoji = ref(false)
const emojiTab = ref(0)
const wsStatus = ref('disconnected')
const loadingMore = ref(false)
const noMoreMessages = ref(false)
const previewImageUrl = ref('')

const messagesRef = ref(null)
const imageInputRef = ref(null)
const videoInputRef = ref(null)

let ws = null
let reconnectTimer = null
let reconnectAttempts = 0
let intentionalClose = false
const MAX_RECONNECT = 5

const wsStatusText = computed(() => {
  const map = { connected: t('dormChat.wsConnected'), disconnected: t('dormChat.wsDisconnected'), failed: t('dormChat.wsFailed') }
  return map[wsStatus.value] || ''
})

// 表情数据 5大类
const emojiCategories = [
  { icon: '😀', name: '笑脸', emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫'] },
  { icon: '🐾', name: '动物', emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🪱','🐛','🦋'] },
  { icon: '🍔', name: '食物', emojis: ['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🫑','🥦','🥬','🌽','🌶️','🫒','🧄','🧅','🥔','🍠'] },
  { icon: '⚽', name: '活动', emojis: ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒','🏑','🥍','🏏','🪃','🥅','⛳','🪁','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛼','🛷'] },
  { icon: '❤️', name: '符号', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉️','☸️','✡️','🔯','🕎','☯️','☦️','🛐'] }
]

// 获取房间信息
async function fetchRoomInfo() {
  // 重置所有状态，防止从其他页面返回时残留旧数据
  messages.value = []
  noMoreMessages.value = false
  loadingMore.value = false
  showEmoji.value = false
  inputText.value = ''
  loading.value = true
  intentionalClose = false
  reconnectAttempts = 0
  try {
    const res = await axios.get('/chat/my-room')
    console.log('[DormChat] my-room 响应:', res)
    if (res.code === 200) {
      roomInfo.value = res.data
      errorMsg.value = ''
      await fetchMessages()
      connectWebSocket()
    } else {
      roomInfo.value = null
      errorMsg.value = res.msg || t('dormChat.loadError')
    }
  } catch (e) {
    console.error('获取群聊信息失败:', e)
    roomInfo.value = null
    errorMsg.value = e?.response?.data?.msg || t('dormChat.loadError')
  } finally {
    loading.value = false
  }
}

// 获取历史消息
async function fetchMessages(beforeId = null) {
  if (!roomInfo.value?.roomId) return
  loadingMore.value = true
  try {
    const params = { limit: 50 }
    if (beforeId) params.beforeId = beforeId
    const res = await axios.get(`/chat/${roomInfo.value.roomId}/messages`, { params })
    console.log('[DormChat] 消息响应:', res)
    if (res.code === 200 && Array.isArray(res.data)) {
      // 将后端数据库字段映射为前端模板期望的字段名
      const mapped = res.data.map(normalizeMessage)
      if (beforeId) {
        messages.value = [...mapped, ...messages.value]
        if (mapped.length < 50) noMoreMessages.value = true
      } else {
        messages.value = mapped
        if (mapped.length < 50) noMoreMessages.value = true
        await nextTick()
        scrollToBottom()
      }
    } else {
      console.warn('[DormChat] 消息接口异常:', res)
    }
  } catch (e) {
    console.error('获取消息失败:', e)
  } finally {
    loadingMore.value = false
  }
}

// 将后端 ChatMessage 实体字段映射为前端模板期望的字段
// 后端: msgType / senderName / createTime
// 前端模板: type / sender / time
function normalizeMessage(msg) {
  return {
    id: msg.id,
    roomId: msg.roomId,
    senderId: msg.senderId,
    sender: msg.senderName || msg.sender || '',
    senderAvatar: msg.senderAvatar || '',
    type: msg.msgType || msg.type || 'TEXT',
    content: msg.content || '',
    time: msg.createTime || msg.time || ''
  }
}

const currentUserId = computed(() => {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}')
    return u.id != null ? Number(u.id) : null
  } catch { return null }
})

// WebSocket 连接
function connectWebSocket() {
  if (!roomInfo.value?.roomId) return
  const token = localStorage.getItem('token')
  if (!token) return

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const wsUrl = `${protocol}//${window.location.host}/ws/chat/${roomInfo.value.roomId}?token=${encodeURIComponent(token)}`

  try {
    ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      wsStatus.value = 'connected'
      reconnectAttempts = 0
    }

    ws.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data)
        // 系统消息（加入/离开通知）直接显示
        if (raw.type === 'system') {
          messages.value.push(raw)
          nextTick(() => scrollToBottom())
          return
        }
        // 过滤自己发送的消息（已通过 addLocalMessage 本地添加）
        const wsMsgSenderId = raw.senderId != null ? Number(raw.senderId) : null
        if (wsMsgSenderId != null && currentUserId.value != null && wsMsgSenderId === currentUserId.value) {
          return
        }
        // 其他人发送的消息，标准化后添加
        const msg = normalizeMessage(raw)
        // 去重：避免重复添加同一条消息
        if (msg.id && messages.value.some(m => m.id === msg.id)) return
        messages.value.push(msg)
        nextTick(() => scrollToBottom())
      } catch (e) {
        console.error('解析消息失败:', e)
      }
    }

    ws.onclose = () => {
      if (intentionalClose) return
      wsStatus.value = 'disconnected'
      if (reconnectAttempts < MAX_RECONNECT) {
        reconnectTimer = setTimeout(() => {
          reconnectAttempts++
          connectWebSocket()
        }, 3000 * (reconnectAttempts + 1))
      } else {
        wsStatus.value = 'failed'
      }
    }

    ws.onerror = () => {
      wsStatus.value = 'failed'
    }
  } catch (e) {
    console.error('WebSocket连接失败:', e)
    wsStatus.value = 'failed'
  }
}

// 本地添加自己发送的消息（立即显示，不等 WS 回显）
function addLocalMessage(type, content) {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const time = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  messages.value.push({
    id: Date.now(), // 临时ID，足够大不会与服务器ID冲突
    roomId: roomInfo.value?.roomId,
    senderId: currentUserId.value,
    sender: user.realName || user.username || '',
    senderAvatar: user.avatar || '',
    type,
    content,
    time
  })
  nextTick(() => scrollToBottom())
}

// 发送文本消息
function sendTextMessage() {
  const text = inputText.value.trim()
  if (!text || !ws || ws.readyState !== WebSocket.OPEN) return
  addLocalMessage('TEXT', text)
  ws.send(JSON.stringify({ type: 'TEXT', content: text }))
  inputText.value = ''
  showEmoji.value = false
}

// 发送表情
function sendEmoji(emoji) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return
  addLocalMessage('EMOJI', emoji)
  ws.send(JSON.stringify({ type: 'EMOJI', content: emoji }))
  showEmoji.value = false
}

// 触发图片上传
function triggerImageUpload() {
  imageInputRef.value?.click()
  showEmoji.value = false
}

// 触发视频上传
function triggerVideoUpload() {
  videoInputRef.value?.click()
  showEmoji.value = false
}

// 处理图片上传
async function handleImageUpload(e) {
  const file = e.target.files[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.warning(t('dormChat.imageLimit'))
    e.target.value = ''
    return
  }
  await uploadMedia(file, 'image')
  e.target.value = ''
}

// 处理视频上传
async function handleVideoUpload(e) {
  const file = e.target.files[0]
  if (!file) return
  if (file.size > 20 * 1024 * 1024) {
    ElMessage.warning(t('dormChat.videoLimit'))
    e.target.value = ''
    return
  }
  await uploadMedia(file, 'video')
  e.target.value = ''
}

// 上传媒体文件
async function uploadMedia(file, type) {
  const formData = new FormData()
  formData.append('file', file)
  try {
    const res = await axios.post(`/chat/upload/${type}`, formData, {
      timeout: 60000
    })
    console.log('[DormChat] 上传响应:', res)
    if (res.code === 200 && res.data?.url) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        const msgType = type === 'image' ? 'IMAGE' : 'VIDEO'
        addLocalMessage(msgType, res.data.url)
        ws.send(JSON.stringify({ type: msgType, content: res.data.url }))
      }
    } else {
      ElMessage.error(res.msg || t('dormChat.uploadFailed'))
    }
  } catch (e) {
    const errMsg = e?.response?.data?.msg || e?.response?.data?.message || e?.message || t('dormChat.uploadFailed')
    ElMessage.error(errMsg)
    console.error('上传失败:', e, e?.response?.data)
  }
}

// 工具函数
function getMediaUrl(url) {
  if (!url) return ''
  if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) return url
  // 后端返回的URL已包含/api前缀，避免重复拼接
  if (url.startsWith('/api')) return url
  const base = import.meta.env.VITE_API_BASE_URL || ''
  return base + url
}

function getAvatarUrl(avatar) {
  if (!avatar) return ''
  if (avatar.startsWith('http')) return avatar
  const base = import.meta.env.VITE_API_BASE_URL || ''
  return base + avatar
}

function previewImage(url) {
  previewImageUrl.value = url
}

function getMessageClass(msg) {
  if (msg.type === 'system') return 'is-system'
  const msgSenderId = msg.senderId != null ? Number(msg.senderId) : null
  if (msgSenderId != null && currentUserId.value != null && msgSenderId === currentUserId.value) {
    return 'is-self'
  }
  return 'is-other'
}

function scrollToBottom() {
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
}

function handleScroll() {
  if (!messagesRef.value || loadingMore.value || noMoreMessages.value) return
  if (messagesRef.value.scrollTop < 50 && messages.value.length > 0) {
    fetchMessages(messages.value[0].id)
  }
}

onMounted(() => {
  fetchRoomInfo()
})

// keep-alive 下页面重新激活时，刷新消息并保持 WebSocket 连接
onActivated(() => {
  // 如果已有房间信息但 WebSocket 断开，重新连接
  if (roomInfo.value && (!ws || ws.readyState !== WebSocket.OPEN)) {
    connectWebSocket()
  }
  // 刷新历史消息，确保离开期间的消息可见
  if (roomInfo.value) {
    fetchMessages()
  }
})

onUnmounted(() => {
  intentionalClose = true
  if (ws) {
    ws.close()
    ws = null
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
})
</script>

<style scoped>
.dorm-chat {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 160px);
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

/* 加载 & 空状态 */
.chat-loading, .chat-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #888;
}
.loading-spinner {
  width: 32px; height: 32px;
  border: 3px solid #eee;
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.empty-icon { font-size: 64px; }
.empty-title { font-size: 14px; color: #888; margin: 0; }
.empty-detail {
  font-size: 13px;
  color: #b45309;
  background: #fef3c7;
  padding: 8px 16px;
  border-radius: 8px;
  margin: 0;
  max-width: 400px;
  text-align: center;
  word-break: break-all;
}

/* 头部 */
.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  background: #fff;
}
.chat-room-name {
  font-size: 16px;
  font-weight: 700;
  color: #000;
  margin: 0;
}
.chat-member-count {
  font-size: 12px;
  color: #888;
}
.ws-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #888;
}
.status-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: #ccc;
}
.ws-status.connected .status-dot { background: #22c55e; }
.ws-status.disconnected .status-dot { background: #f59e0b; animation: pulse 1.5s infinite; }
.ws-status.failed .status-dot { background: #ef4444; }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

/* 消息列表 */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #fafafa;
}
.loading-more, .no-more, .no-messages {
  text-align: center;
  font-size: 12px;
  color: #aaa;
  padding: 8px 0;
}

/* 系统消息 */
.system-message {
  text-align: center;
  font-size: 12px;
  color: #999;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 4px 0;
}
.msg-time-small { font-size: 11px; color: #bbb; }

/* 用户消息 */
.user-message {
  display: flex;
  gap: 10px;
  max-width: 75%;
}
.message-item.is-self .user-message {
  flex-direction: row-reverse;
  margin-left: auto;
}
.message-avatar {
  width: 36px; height: 36px;
  border-radius: 50%;
  background: #e8e8e8;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  font-size: 14px;
  font-weight: 600;
  color: #666;
}
.message-avatar img {
  width: 100%; height: 100%;
  object-fit: cover;
}
.message-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.message-item.is-self .message-body {
  align-items: flex-end;
}
.message-meta {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: #999;
}
.sender-name { font-weight: 500; }
.message-content {
  background: #fff;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
}
.message-item.is-self .message-content {
  background: #000;
  color: #fff;
}
.text-content { white-space: pre-wrap; }
.emoji-content { font-size: 32px; line-height: 1.2; }
.image-content {
  max-width: 240px;
  max-height: 240px;
  border-radius: 8px;
  cursor: pointer;
  display: block;
}
.video-content {
  max-width: 280px;
  max-height: 200px;
  border-radius: 8px;
  display: block;
}

/* 表情面板 */
.emoji-panel {
  border-top: 1px solid #f0f0f0;
  background: #fff;
  padding: 8px 12px;
}
.emoji-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
}
.emoji-tab {
  padding: 4px 10px;
  border: none;
  background: #f5f5f5;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.15s;
}
.emoji-tab.active { background: #000; }
.emoji-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 2px;
  max-height: 120px;
  overflow-y: auto;
}
.emoji-btn {
  padding: 4px;
  border: none;
  background: none;
  font-size: 20px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.15s;
}
.emoji-btn:hover { background: #f0f0f0; }

.emoji-panel-enter-active, .emoji-panel-leave-active { transition: all 0.2s ease; }
.emoji-panel-enter-from, .emoji-panel-leave-to { opacity: 0; transform: translateY(8px); }

/* 输入区域 */
.chat-input-area {
  border-top: 1px solid #f0f0f0;
  background: #fff;
  padding: 10px 16px;
}
.input-toolbar {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
}
.toolbar-btn {
  padding: 4px 8px;
  border: none;
  background: none;
  font-size: 18px;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.15s;
}
.toolbar-btn:hover { background: #f0f0f0; }
.input-row {
  display: flex;
  gap: 8px;
}
.chat-input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}
.chat-input:focus { border-color: #000; }
.send-btn {
  padding: 10px 20px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}
.send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.send-btn:not(:disabled):hover { opacity: 0.85; }

/* 图片预览 */
.image-preview-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  cursor: pointer;
}
.image-preview-overlay img {
  max-width: 90vw;
  max-height: 90vh;
  border-radius: 8px;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .dorm-chat { height: calc(100dvh - 150px); border-radius: 0; margin: -16px; padding: 0; }
  .chat-header { padding: 12px 16px; }
  .chat-messages { padding: 12px; }
  .emoji-grid { grid-template-columns: repeat(8, 1fr); }
  .user-message { max-width: 85%; }
  .chat-input-area { padding: 8px 12px; padding-bottom: calc(8px + env(safe-area-inset-bottom)); }
}
</style>
