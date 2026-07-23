<template>
  <div class="meeting-page">
    <!-- ==================== 大厅页面 ==================== -->
    <div v-if="pageState === 'lobby'" class="meeting-lobby">
      <h2 class="page-title">{{ t('meeting.title') }}</h2>

      <div v-if="errorMsg" class="no-permission">
        <el-icon :size="60" class="no-permission-icon"><WarningFilled /></el-icon>
        <p class="error-detail">{{ errorMsg }}</p>
      </div>

      <div v-else class="lobby-content">
        <div v-if="canStart" class="scope-card">
          <div class="scope-icon">
            <el-icon :size="32"><VideoCamera /></el-icon>
          </div>
          <div class="scope-info">
            <h3>{{ scopeTitle }}</h3>
            <p>{{ scopeDesc }}</p>
          </div>
        </div>

        <div v-else class="scope-card">
          <div class="scope-icon">
            <el-icon :size="32"><Connection /></el-icon>
          </div>
          <div class="scope-info">
            <h3>{{ t('meeting.joinOnly') }}</h3>
            <p>{{ t('meeting.joinOnlyDesc') }}</p>
          </div>
        </div>

        <el-form v-if="canStart" :model="meetingForm" label-width="100px" class="meeting-form">
          <el-form-item :label="t('meeting.roomId')">
            <el-input v-model="meetingForm.roomId" :placeholder="t('meeting.roomIdPlaceholder')" />
          </el-form-item>
          <el-form-item :label="t('meeting.password')">
            <el-input v-model="meetingForm.password" :placeholder="t('meeting.passwordPlaceholder')" show-password />
          </el-form-item>
          <el-form-item :label="t('meeting.subject')">
            <el-input v-model="meetingForm.subject" :placeholder="t('meeting.subjectPlaceholder')" />
          </el-form-item>
        </el-form>

        <div class="action-buttons">
          <el-button v-if="canStart" type="primary" size="large" @click="goToPreview('start')" :loading="loading">
            <el-icon><VideoCamera /></el-icon>
            {{ t('meeting.startMeeting') }}
          </el-button>
          <el-button size="large" @click="showJoinDialog = true">
            <el-icon><Connection /></el-icon>
            {{ t('meeting.joinMeeting') }}
          </el-button>
        </div>
      </div>
    </div>

    <!-- ==================== 预览页面 ==================== -->
    <div v-else-if="pageState === 'preview'" class="meeting-preview">
      <div class="preview-header">
        <h2>{{ t('meeting.previewTitle') }}</h2>
        <p class="preview-room">{{ t('meeting.roomId') }}: {{ meetingForm.roomId }}</p>
      </div>

      <div class="preview-body">
        <div class="preview-video-wrap">
          <div ref="previewVideoRef" class="preview-video"></div>
          <div v-if="!previewCameraEnabled" class="preview-camera-off">
            <el-icon :size="48"><VideoPause /></el-icon>
            <p>{{ t('meeting.cameraOff') }}</p>
          </div>
        </div>

        <div class="preview-controls">
          <el-tooltip :content="previewMicEnabled ? t('meeting.micOn') : t('meeting.micOff')" placement="top">
            <el-button
              :type="previewMicEnabled ? 'primary' : 'danger'"
              circle
              size="large"
              @click="togglePreviewMic"
            >
              <el-icon :size="20">
                <Microphone v-if="previewMicEnabled" />
                <Mute v-else />
              </el-icon>
            </el-button>
          </el-tooltip>

          <el-tooltip :content="previewCameraEnabled ? t('meeting.cameraOn') : t('meeting.cameraOff')" placement="top">
            <el-button
              :type="previewCameraEnabled ? 'primary' : 'danger'"
              circle
              size="large"
              @click="togglePreviewCamera"
            >
              <el-icon :size="20">
                <VideoCamera v-if="previewCameraEnabled" />
                <VideoPause v-else />
              </el-icon>
            </el-button>
          </el-tooltip>
        </div>
      </div>

      <div class="preview-footer">
        <el-button size="large" @click="pageState = 'lobby'">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" size="large" @click="enterMeetingFromPreview" :loading="loading">
          {{ t('meeting.enterMeeting') }}
        </el-button>
      </div>
    </div>

    <!-- ==================== 会议中页面 ==================== -->
    <div v-else class="meeting-room-container">
      <!-- 顶部栏 -->
      <div class="room-header">
        <div class="room-info">
          <span class="room-id">{{ t('meeting.roomId') }}: {{ meetingForm.roomId }}</span>
          <span class="room-subject" v-if="meetingForm.subject">{{ meetingForm.subject }}</span>
          <span class="room-duration">{{ meetingDuration }}</span>
        </div>
        <div class="room-actions">
          <el-tooltip :content="t('meeting.invite')" placement="bottom">
            <el-button circle size="small" @click="copyRoomId">
              <el-icon><Share /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip :content="t('meeting.layoutGrid')" placement="bottom">
            <el-button circle size="small" :type="layoutMode === 'grid' ? 'primary' : ''" @click="layoutMode = 'grid'">
              <el-icon><Grid /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip :content="t('meeting.layoutSpeaker')" placement="bottom">
            <el-button circle size="small" :type="layoutMode === 'speaker' ? 'primary' : ''" @click="layoutMode = 'speaker'">
              <el-icon><UserFilled /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip :content="t('meeting.chat')" placement="bottom">
            <el-button circle size="small" :type="showChatPanel ? 'primary' : ''" @click="showChatPanel = !showChatPanel">
              <el-icon><ChatDotRound /></el-icon>
              <span v-if="unreadCount > 0" class="chat-badge">{{ unreadCount }}</span>
            </el-button>
          </el-tooltip>
        </div>
      </div>

      <!-- 主体区域 -->
      <div class="room-body" :class="{ 'chat-open': showChatPanel }">
        <!-- 视频区域 -->
        <div class="video-area">
          <!-- 网格布局 -->
          <div v-if="layoutMode === 'grid'" class="layout-grid" :class="gridLayoutClass">
            <div class="video-item local-item" @click="pinUser('local')">
              <div ref="localVideoRef" class="video-element"></div>
              <div class="video-overlay">
                <span class="user-name">{{ userStore.user?.realName || userStore.user?.username }} ({{ t('meeting.me') }})</span>
                <div class="user-status">
                  <el-icon v-if="!micEnabled" class="status-off"><Mute /></el-icon>
                  <el-icon v-if="!cameraEnabled" class="status-off"><VideoPause /></el-icon>
                </div>
              </div>
            </div>
            <div
              v-for="remote in remoteUsers"
              :key="remote.getUserId()"
              class="video-item"
              @click="pinUser(remote.getUserId())"
            >
              <div :ref="el => setRemoteVideoRef(el, remote.getUserId())" class="video-element"></div>
              <div class="video-overlay">
                <span class="user-name">{{ remote.getUserId() }}</span>
              </div>
            </div>
          </div>

          <!-- 主讲人布局 -->
          <div v-else-if="layoutMode === 'speaker'" class="layout-speaker">
            <div class="speaker-main" @click="pinnedUserId && pinUser(null)">
              <div ref="speakerMainRef" class="video-element"></div>
              <div class="video-overlay">
                <span class="user-name">{{ !pinnedUserId ? (userStore.user?.realName || userStore.user?.username + ' (' + t('meeting.me') + ')') : pinnedUserId }}</span>
                <div v-if="!pinnedUserId" class="user-status">
                  <el-icon v-if="!micEnabled" class="status-off"><Mute /></el-icon>
                  <el-icon v-if="!cameraEnabled" class="status-off"><VideoPause /></el-icon>
                </div>
                <span v-if="pinnedUserId" class="pin-indicator">{{ t('meeting.speaker') }}</span>
              </div>
            </div>
            <div class="speaker-side">
              <div
                v-for="remote in remoteUsers"
                :key="remote.getUserId()"
                class="side-item"
                :class="{ 'side-item-active': pinnedUserId === remote.getUserId() }"
                @click="pinUser(remote.getUserId())"
              >
                <div :ref="el => setRemoteVideoRef(el, remote.getUserId())" class="video-element"></div>
                <div class="video-overlay">
                  <span class="user-name">{{ remote.getUserId() }}</span>
                </div>
              </div>
              <div
                v-if="remoteUsers.length > 0"
                class="side-item"
                :class="{ 'side-item-active': !pinnedUserId }"
                @click="pinUser(null)"
              >
                <div ref="localSideVideoRef" class="video-element"></div>
                <div class="video-overlay">
                  <span class="user-name">{{ userStore.user?.realName || userStore.user?.username }} ({{ t('meeting.me') }})</span>
                </div>
              </div>
              <div v-if="remoteUsers.length === 0" class="side-empty">
                <el-icon :size="24"><User /></el-icon>
                <span>{{ t('meeting.waiting') }}</span>
              </div>
            </div>
          </div>

          <!-- 画廊布局 -->
          <div v-else-if="layoutMode === 'gallery'" class="layout-gallery">
            <div class="gallery-main">
              <div ref="localVideoRef" class="video-element"></div>
              <div class="video-overlay">
                <span class="user-name">{{ userStore.user?.realName || userStore.user?.username }} ({{ t('meeting.me') }})</span>
                <div class="user-status">
                  <el-icon v-if="!micEnabled" class="status-off"><Mute /></el-icon>
                  <el-icon v-if="!cameraEnabled" class="status-off"><VideoPause /></el-icon>
                </div>
              </div>
            </div>
            <div class="gallery-strip">
              <div v-for="remote in remoteUsers" :key="remote.getUserId()" class="gallery-item">
                <div :ref="el => setRemoteVideoRef(el, remote.getUserId())" class="video-element"></div>
                <div class="video-overlay">
                  <span class="user-name">{{ remote.getUserId() }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 聊天面板 -->
        <div v-if="showChatPanel" class="chat-panel">
          <div class="chat-header">
            <span>{{ t('meeting.chat') }}</span>
            <el-icon class="chat-close" @click="showChatPanel = false"><Close /></el-icon>
          </div>
          <div class="chat-messages" ref="chatMessagesRef">
            <div v-if="chatMessages.length === 0" class="chat-empty">
              <el-icon :size="32"><ChatLineRound /></el-icon>
              <p>{{ t('meeting.message') }}</p>
            </div>
            <div
              v-for="(msg, idx) in chatMessages"
              :key="idx"
              class="chat-msg"
              :class="{ self: msg.isSelf }"
            >
              <div class="msg-sender">{{ msg.sender }}</div>
              <div class="msg-content">{{ msg.content }}</div>
              <div class="msg-time">{{ msg.time }}</div>
            </div>
          </div>
          <div class="chat-input-area">
            <el-input
              v-model="chatInput"
              :placeholder="t('meeting.chatPlaceholder')"
              @keyup.enter="sendChatMessage"
            />
            <el-button type="primary" @click="sendChatMessage">{{ t('meeting.send') }}</el-button>
          </div>
        </div>
      </div>

      <!-- 底部工具栏 -->
      <div class="room-toolbar">
        <div class="toolbar-left">
          <el-tooltip :content="micEnabled ? t('meeting.micOn') : t('meeting.micOff')" placement="top">
            <el-button
              :type="micEnabled ? 'primary' : 'danger'"
              circle
              size="large"
              @click="toggleMic"
            >
              <el-icon :size="20">
                <Microphone v-if="micEnabled" />
                <Mute v-else />
              </el-icon>
            </el-button>
          </el-tooltip>

          <el-tooltip :content="cameraEnabled ? t('meeting.cameraOn') : t('meeting.cameraOff')" placement="top">
            <el-button
              :type="cameraEnabled ? 'primary' : 'danger'"
              circle
              size="large"
              @click="toggleCamera"
            >
              <el-icon :size="20">
                <VideoCamera v-if="cameraEnabled" />
                <VideoPause v-else />
              </el-icon>
            </el-button>
          </el-tooltip>

          <el-tooltip :content="screenSharing ? t('meeting.stopScreenShare') : t('meeting.screenShare')" placement="top">
            <el-button
              :type="screenSharing ? 'warning' : ''"
              circle
              size="large"
              @click="toggleScreenShare"
            >
              <el-icon :size="20"><Monitor /></el-icon>
            </el-button>
          </el-tooltip>
        </div>

        <div class="toolbar-center">
          <el-button type="danger" size="large" round @click="leaveMeeting">
            <el-icon><SwitchButton /></el-icon>
            {{ t('meeting.leave') }}
          </el-button>
        </div>

        <div class="toolbar-right">
          <el-tooltip :content="showChatPanel ? t('common.cancel') : t('meeting.chat')" placement="top">
            <el-button
              circle
              size="large"
              :type="showChatPanel ? 'primary' : ''"
              @click="showChatPanel = !showChatPanel"
            >
              <el-icon :size="20"><ChatDotRound /></el-icon>
            </el-button>
          </el-tooltip>
        </div>
      </div>
    </div>

    <!-- ==================== 加入会议对话框 ==================== -->
    <el-dialog v-model="showJoinDialog" :title="t('meeting.joinMeeting')" width="400px">
      <el-form :model="joinForm" label-width="80px">
        <el-form-item :label="t('meeting.roomId')">
          <el-input v-model="joinForm.roomId" :placeholder="t('meeting.roomIdPlaceholder')" />
        </el-form-item>
        <el-form-item :label="t('meeting.password')" v-if="false">
          <el-input v-model="joinForm.password" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showJoinDialog = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="goToPreview('join')" :loading="loading">{{ t('meeting.join') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '../stores/user'
import { ElMessage } from 'element-plus'
import {
  Lock, VideoCamera, Connection, SwitchButton,
  Microphone, Mute, VideoPause, Loading, WarningFilled,
  Share, Grid, UserFilled, ChatDotRound, Close, ChatLineRound,
  User, Monitor
} from '@element-plus/icons-vue'
import request from '../utils/request'

const { t } = useI18n()
const userStore = useUserStore()

const loading = ref(false)
const pageState = ref('lobby') // lobby | preview | inMeeting
const canStart = ref(false)
const scopeInfo = ref({})
const showJoinDialog = ref(false)
const errorMsg = ref('')

// 预览相关
const previewVideoRef = ref(null)
const previewMicEnabled = ref(true)
const previewCameraEnabled = ref(true)
let previewStream = null

// 视频区域
const localVideoRef = ref(null)
const localSideVideoRef = ref(null)
const speakerMainRef = ref(null)
const remoteVideoRefs = {}
let trtcClient = null
let localStream = null
let screenStream = null

const meetingForm = reactive({
  roomId: '',
  password: '',
  subject: ''
})

const joinForm = reactive({
  roomId: '',
  password: ''
})

const micEnabled = ref(true)
const cameraEnabled = ref(true)
const screenSharing = ref(false)
const remoteUsers = ref([])

// 布局
const layoutMode = ref('grid') // grid | speaker | gallery

// 主讲人/聚焦用户
const pinnedUserId = ref(null) // 被放大的用户ID（null表示自己）

// 移动端网格布局根据人数动态调整
const gridLayoutClass = computed(() => {
  const total = remoteUsers.value.length + 1 // +1 for local user
  if (total === 1) return 'grid-layout-1'
  if (total === 2) return 'grid-layout-2'
  if (total === 3) return 'grid-layout-3'
  if (total === 4) return 'grid-layout-4'
  return 'grid-layout-4' // 5+ people, scrollable 2x2
})

const updateVideoPlayback = async () => {
  // 确保DOM已经更新
  await nextTick()

  if (layoutMode.value !== 'speaker') {
    // 网格或画廊模式
    if (localStream && localVideoRef.value) {
      try {
        await localStream.play(localVideoRef.value)
      } catch (e) {
        console.log('播放本地视频失败', e)
      }
    }
    remoteUsers.value.forEach(remote => {
      const uid = remote.getUserId()
      const el = remoteVideoRefs[uid]
      if (el) {
        try {
          remote.play(el)
        } catch (e) {
          console.log('播放远端视频失败', uid, e)
        }
      }
    })
    return
  }

  // 主讲人模式
  if (!pinnedUserId.value) {
    // 没有选中任何人，显示自己为主讲人
    if (localStream && speakerMainRef.value) {
      try {
        await localStream.play(speakerMainRef.value)
      } catch (e) {
        console.log('播放本地视频到主区域失败', e)
      }
    }
    // 远端用户显示在侧边栏
    remoteUsers.value.forEach(remote => {
      const uid = remote.getUserId()
      const el = remoteVideoRefs[uid]
      if (el) {
        try {
          remote.play(el)
        } catch (e) {
          console.log('播放远端视频失败', uid, e)
        }
      }
    })
  } else {
    // 选中了某个远端用户作为主讲人
    const pinnedUser = remoteUsers.value.find(u => u.getUserId() === pinnedUserId.value)
    if (pinnedUser && speakerMainRef.value) {
      try {
        await pinnedUser.play(speakerMainRef.value)
      } catch (e) {
        console.log('播放主讲人视频失败', e)
      }
    }
    // 其他远端用户显示在侧边栏（排除当前主讲人）
    remoteUsers.value.forEach(remote => {
      const uid = remote.getUserId()
      if (uid === pinnedUserId.value) return // 主讲人已经在主区域播放
      const el = remoteVideoRefs[uid]
      if (el) {
        try {
          remote.play(el)
        } catch (e) {
          console.log('播放远端视频失败', uid, e)
        }
      }
    })
    // 本地视频显示在侧边栏
    if (localStream && localSideVideoRef.value) {
      try {
        await localStream.play(localSideVideoRef.value)
      } catch (e) {
        console.log('播放本地视频到侧边栏失败', e)
      }
    }
  }
}

// 监听布局变化，重新播放视频
watch(layoutMode, () => {
  updateVideoPlayback()
})

// 点击放大某个用户
const pinUser = (uid) => {
  pinnedUserId.value = pinnedUserId.value === uid ? null : uid
}

watch(pinnedUserId, () => {
  updateVideoPlayback()
})

// 聊天
const showChatPanel = ref(false)
const chatMessages = ref([])
const chatInput = ref('')
const chatMessagesRef = ref(null)
const unreadCount = ref(0)
let chatPollingTimer = null
let lastMessageId = 0

// 会议时长
const meetingStartTime = ref(null)
const meetingDuration = ref('00:00')
let durationTimer = null

const scopeTitle = computed(() => {
  if (scopeInfo.value.role === 'COUNSELOR') {
    return t('meeting.classMeeting')
  } else if (scopeInfo.value.role === 'DORM_LEADER') {
    return t('meeting.dormMeeting')
  }
  return ''
})

const scopeDesc = computed(() => {
  if (scopeInfo.value.role === 'COUNSELOR') {
    return `${scopeInfo.value.college || ''} ${scopeInfo.value.grade || ''} ${scopeInfo.value.className || ''}`
  } else if (scopeInfo.value.role === 'DORM_LEADER') {
    return `${scopeInfo.value.building || ''} ${scopeInfo.value.room || ''} ${t('meeting.dorm')}`
  }
  return ''
})

// 监听聊天面板打开，重置未读数
watch(showChatPanel, (val) => {
  if (val) {
    unreadCount.value = 0
    nextTick(() => {
      scrollChatToBottom()
    })
  }
})

const scrollChatToBottom = () => {
  if (chatMessagesRef.value) {
    chatMessagesRef.value.scrollTop = chatMessagesRef.value.scrollHeight
  }
}

const loadCanStart = async () => {
  try {
    const res = await request.get('/trtc/canStart')
    if (res.code === 200) {
      canStart.value = res.data.canStart
      scopeInfo.value = res.data
      if (res.data.role === 'COUNSELOR') {
        meetingForm.roomId = `class_${res.data.college}_${res.data.grade}_${res.data.className}`
      } else if (res.data.role === 'DORM_LEADER') {
        meetingForm.roomId = `dorm_${res.data.building}_${res.data.room}`
      }
    } else {
      errorMsg.value = res.message || '查询权限失败'
      canStart.value = false
    }
  } catch (e) {
    console.error('查询权限失败', e)
    errorMsg.value = '请求失败: ' + (e.response?.status || e.message || '未知错误') + '，请确保后端服务已更新'
    canStart.value = false
  }
}

const genRoomId = (input) => {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i)
    hash = hash & hash
  }
  return Math.abs(hash) % 100000
}

const goToPreview = async (type) => {
  if (type === 'start') {
    if (!meetingForm.roomId) {
      ElMessage.warning(t('meeting.pleaseInputRoomId'))
      return
    }
  } else {
    if (!joinForm.roomId) {
      ElMessage.warning(t('meeting.pleaseInputRoomId'))
      return
    }
    meetingForm.roomId = joinForm.roomId
    
    try {
      const res = await request.get('/trtc/canJoin', {
        params: { roomId: meetingForm.roomId }
      })
      if (res.code !== 200) {
        ElMessage.error(res.message)
        return
      }
    } catch (e) {
      ElMessage.error('验证会议权限失败: ' + (e.response?.data?.message || e.message))
      return
    }
  }
  showJoinDialog.value = false
  pageState.value = 'preview'
  await initPreviewStream()
}

const initPreviewStream = async () => {
  try {
    const TRTC = (await import('trtc-js-sdk')).default
    const res = await request.get('/trtc/userSig')
    if (res.code !== 200) {
      ElMessage.error(res.message)
      pageState.value = 'lobby'
      return
    }
    const { userId } = res.data
    
    // 确保至少开启音频或视频
    if (!previewMicEnabled.value && !previewCameraEnabled.value) {
      previewMicEnabled.value = true
    }
    
    previewStream = TRTC.createStream({
      userId: String(userId),
      audio: previewMicEnabled.value,
      video: previewCameraEnabled.value
    })
    await previewStream.initialize()
    await nextTick()
    await previewStream.play(previewVideoRef.value)
  } catch (error) {
    console.error('预览初始化失败', error)
    ElMessage.warning(t('meeting.deviceTest') + ': ' + (error.message || ''))
  }
}

// 统一的预览流重新创建函数（TRTC SDK的mute/unmute在某些环境下会访问null的内部mediaStream）
const recreatePreviewStream = async (newAudio, newVideo) => {
  if (!previewStream) return false
  const TRTC = (await import('trtc-js-sdk')).default
  try {
    await previewStream.stop()
  } catch (e) { console.log('停止预览流失败', e) }
  try {
    previewStream.close()
  } catch (e) { console.log('关闭预览流失败', e) }

  previewMicEnabled.value = newAudio
  previewCameraEnabled.value = newVideo

  const res = await request.get('/trtc/userSig')
  if (res.code !== 200) {
    ElMessage.error(res.message)
    return false
  }

  previewStream = TRTC.createStream({
    userId: String(res.data.userId),
    audio: newAudio,
    video: newVideo
  })
  await previewStream.initialize()
  await nextTick()
  if (previewVideoRef.value) {
    await previewStream.play(previewVideoRef.value)
  }
  return true
}

const togglePreviewMic = async () => {
  if (!previewStream) return
  try {
    // 如果要关闭麦克风，且摄像头已关闭，则不允许关闭（必须保留一个）
    if (previewMicEnabled.value && !previewCameraEnabled.value) {
      ElMessage.warning('至少需要保持麦克风或摄像头开启')
      return
    }
    await recreatePreviewStream(!previewMicEnabled.value, previewCameraEnabled.value)
  } catch (e) {
    console.error('切换预览麦克风失败', e)
    ElMessage.error('切换麦克风失败: ' + (e.message || '未知错误'))
  }
}

const togglePreviewCamera = async () => {
  if (!previewStream) {
    ElMessage.warning('预览流未初始化，请刷新页面')
    return
  }
  try {
    // 如果要关闭摄像头，且麦克风已关闭，则不允许关闭（必须保留一个）
    if (previewCameraEnabled.value && !previewMicEnabled.value) {
      ElMessage.warning('至少需要保持麦克风或摄像头开启')
      return
    }
    await recreatePreviewStream(previewMicEnabled.value, !previewCameraEnabled.value)
  } catch (e) {
    console.error('切换预览摄像头失败', e)
    ElMessage.error('切换摄像头失败: ' + (e.message || '未知错误'))
  }
}

const enterMeetingFromPreview = async () => {
  loading.value = true
  try {
    // 停止预览流，后面会重新创建
    if (previewStream) {
      await previewStream.stop()
      previewStream.close()
      previewStream = null
    }
    await enterMeeting(meetingForm.roomId)
  } finally {
    loading.value = false
  }
}

const enterMeeting = async (roomId) => {
  try {
    const res = await request.get('/trtc/userSig')
    if (res.code !== 200) {
      ElMessage.error(res.message)
      return
    }

    const { sdkAppId, userId, userSig } = res.data
    const TRTC = (await import('trtc-js-sdk')).default

    trtcClient = TRTC.createClient({
      sdkAppId: Number(sdkAppId),
      userId: String(userId),
      userSig: userSig,
      mode: 'rtc'
    })

    trtcClient.on('peer-join', (event) => {
      console.log('用户加入', event.userId)
      addChatMessage('system', `${event.userId} ${t('meeting.joined')}`, false)
    })

    trtcClient.on('peer-leave', (event) => {
      console.log('用户离开', event.userId)
      remoteUsers.value = remoteUsers.value.filter(u => u.getUserId() !== event.userId)
      addChatMessage('system', `${event.userId} ${t('meeting.left')}`, false)
    })

    trtcClient.on('stream-added', (event) => {
      const remoteStream = event.stream
      trtcClient.subscribe(remoteStream, { audio: true, video: true }).catch(e => {
        console.error('订阅远端流失败', e)
      })
    })

    trtcClient.on('stream-subscribed', (event) => {
      const remoteStream = event.stream
      const uid = remoteStream.getUserId()
      remoteUsers.value.push(remoteStream)
      nextTick(() => {
        const el = remoteVideoRefs[uid]
        if (el) {
          try {
            remoteStream.play(el)
          } catch (e) {
            console.error('播放远端流失败', e)
          }
        }
      })
    })

    trtcClient.on('stream-removed', (event) => {
      const uid = event.stream.getUserId()
      remoteUsers.value = remoteUsers.value.filter(u => u.getUserId() !== uid)
      if (pinnedUserId.value === uid) {
        pinnedUserId.value = null
      }
    })

    trtcClient.on('error', (error) => {
      console.error('TRTC error', error)
      ElMessage.error(t('meeting.networkError'))
    })

    const numericRoomId = genRoomId(roomId)
    await trtcClient.join({ roomId: numericRoomId })

    // 创建本地流（确保至少开启音频或视频）
    const hasAudio = previewMicEnabled.value
    const hasVideo = previewCameraEnabled.value
    
    if (!hasAudio && !hasVideo) {
      // 如果两者都关闭，默认开启音频
      previewMicEnabled.value = true
    }
    
    localStream = TRTC.createStream({
      userId: String(userId),
      audio: previewMicEnabled.value,
      video: previewCameraEnabled.value
    })
    await localStream.initialize()

    micEnabled.value = previewMicEnabled.value
    cameraEnabled.value = previewCameraEnabled.value

    pageState.value = 'inMeeting'
    await nextTick()
    if (layoutMode.value === 'speaker') {
      if (speakerMainRef.value) {
        await localStream.play(speakerMainRef.value)
      }
    } else {
      if (localVideoRef.value) {
        await localStream.play(localVideoRef.value)
      }
    }
    await trtcClient.publish(localStream)

    // 启动聊天轮询
    startChatPolling(roomId)

    // 开始计时
    meetingStartTime.value = Date.now()
    startDurationTimer()

    ElMessage.success(t('meeting.joined'))
  } catch (error) {
    console.error('进入会议失败', error)
    ElMessage.error(t('meeting.joinFailed') + ': ' + (error.message || ''))
    pageState.value = 'lobby'
  }
}

const startDurationTimer = () => {
  durationTimer = setInterval(() => {
    if (!meetingStartTime.value) return
    const diff = Math.floor((Date.now() - meetingStartTime.value) / 1000)
    const m = String(Math.floor(diff / 60)).padStart(2, '0')
    const s = String(diff % 60).padStart(2, '0')
    meetingDuration.value = `${m}:${s}`
  }, 1000)
}

const setRemoteVideoRef = (el, userId) => {
  if (el) {
    remoteVideoRefs[userId] = el
    const remoteUser = remoteUsers.value.find(u => u.getUserId() === userId)
    if (remoteUser) {
      nextTick(() => {
        // 只在非主讲人模式下自动播放；主讲人模式下由 updateVideoPlayback 统一管理
        if (layoutMode.value !== 'speaker') {
          try {
            remoteUser.play(el)
          } catch (e) {
            console.error('播放远端视频失败', e)
          }
        }
      })
    }
  }
}

const recreateLocalStream = async (newAudio, newVideo) => {
  if (!localStream || !trtcClient) return false
  const TRTC = (await import('trtc-js-sdk')).default
  const userId = localStream.getUserId()

  // 先取消发布并停止旧流
  try {
    await trtcClient.unpublish(localStream)
  } catch (e) { console.log('unpublish失败', e) }
  try {
    localStream.stop()
  } catch (e) { console.log('停止本地流失败', e) }
  try {
    localStream.close()
  } catch (e) { console.log('关闭本地流失败', e) }

  micEnabled.value = newAudio
  cameraEnabled.value = newVideo

  localStream = TRTC.createStream({
    userId: String(userId),
    audio: newAudio,
    video: newVideo
  })
  await localStream.initialize()

  // 重新播放
  await nextTick()
  await updateVideoPlayback()

  // 重新发布
  await trtcClient.publish(localStream)
  return true
}

const toggleMic = async () => {
  if (!localStream) return
  try {
    await recreateLocalStream(!micEnabled.value, cameraEnabled.value)
  } catch (e) {
    console.error('切换麦克风失败', e)
    ElMessage.error('切换麦克风失败: ' + (e.message || '未知错误'))
  }
}

const toggleCamera = async () => {
  if (!localStream) return
  try {
    await recreateLocalStream(micEnabled.value, !cameraEnabled.value)
  } catch (e) {
    console.error('切换摄像头失败', e)
    ElMessage.error('切换摄像头失败: ' + (e.message || '未知错误'))
  }
}

const toggleScreenShare = async () => {
  if (!trtcClient) return

  // 检测是否支持屏幕共享
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  if (isMobile) {
    ElMessage.warning('移动端暂不支持屏幕共享，请使用PC端')
    return
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
    ElMessage.error('您的浏览器不支持屏幕共享，请使用最新版Chrome/Edge/Firefox')
    return
  }

  try {
    if (screenSharing.value) {
      // 停止屏幕共享：先unpublish屏幕流，再重新publish本地流
      if (screenStream) {
        await trtcClient.unpublish(screenStream)
        await screenStream.stop()
        screenStream.close()
        screenStream = null
      }
      // 重新发布本地摄像头流
      if (localStream) {
        await trtcClient.publish(localStream)
      }
      screenSharing.value = false
      ElMessage.success(t('meeting.stopScreenShare'))
    } else {
      // 开始屏幕共享：先unpublish本地流，再publish屏幕流
      const TRTC = (await import('trtc-js-sdk')).default
      if (localStream) {
        await trtcClient.unpublish(localStream)
      }
      screenStream = TRTC.createStream({
        userId: String(userStore.user?.id || 'user'),
        screenAudio: false,
        screen: true
      })

      // 监听屏幕共享停止事件（用户点击停止按钮）
      screenStream.on('screen-sharing-stopped', async () => {
        console.log('用户停止了屏幕共享')
        try {
          await trtcClient.unpublish(screenStream)
          screenStream.close()
          screenStream = null
          screenSharing.value = false
          // 重新发布本地摄像头流
          if (localStream) {
            await trtcClient.publish(localStream)
          }
          ElMessage.success(t('meeting.stopScreenShare'))
        } catch (e) {
          console.error('停止屏幕共享失败', e)
        }
      })

      await screenStream.initialize()
      await trtcClient.publish(screenStream)
      screenSharing.value = true
      ElMessage.success(t('meeting.screenShare'))
    }
  } catch (e) {
    console.error('屏幕共享失败', e)
    let errorMsg = '屏幕共享失败'
    if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
      errorMsg = '您取消了屏幕共享'
    } else if (e.name === 'NotSupportedError') {
      errorMsg = '您的浏览器不支持屏幕共享'
    } else if (e.name === 'NotFoundError') {
      errorMsg = '未找到可共享的屏幕'
    } else if (e.message && e.message.includes('INVALID_OPERATION')) {
      errorMsg = '您的浏览器版本过低，请升级后重试'
    }
    ElMessage.error(errorMsg)
    // 确保出错后恢复摄像头流
    if (!screenSharing.value && localStream) {
      try {
        await trtcClient.publish(localStream)
      } catch (publishErr) {
        console.error('恢复摄像头流失败', publishErr)
      }
    }
  }
}

const leaveMeeting = async () => {
  try {
    if (durationTimer) {
      clearInterval(durationTimer)
      durationTimer = null
    }
    if (localStream) {
      await localStream.stop()
      localStream.close()
      localStream = null
    }
    if (screenStream) {
      await screenStream.stop()
      screenStream.close()
      screenStream = null
    }
    if (trtcClient) {
      try {
        if (localStream) {
          await trtcClient.unpublish(localStream)
        }
        if (screenStream) {
          await trtcClient.unpublish(screenStream)
        }
      } catch (e) {
        console.log('unpublish ignored', e)
      }
      await trtcClient.leave()
      trtcClient = null
    }
    // 停止聊天轮询
    stopChatPolling()
  } catch (e) {
    console.error('退出会议异常', e)
  } finally {
    pageState.value = 'lobby'
    micEnabled.value = true
    cameraEnabled.value = true
    screenSharing.value = false
    remoteUsers.value = []
    chatMessages.value = []
    unreadCount.value = 0
    showChatPanel.value = false
    meetingStartTime.value = null
    meetingDuration.value = '00:00'
    ElMessage.success(t('meeting.left'))
  }
}

const copyRoomId = () => {
  navigator.clipboard.writeText(meetingForm.roomId).then(() => {
    ElMessage.success(t('meeting.copySuccess'))
  }).catch(() => {
    // 降级方案
    const input = document.createElement('input')
    input.value = meetingForm.roomId
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    ElMessage.success(t('meeting.copySuccess'))
  })
}

const addChatMessage = (sender, content, isSelf) => {
  const now = new Date()
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  chatMessages.value.push({
    sender: isSelf ? t('meeting.you') : sender,
    content,
    time,
    isSelf
  })
  if (!showChatPanel.value && !isSelf) {
    unreadCount.value++
  }
  nextTick(() => {
    scrollChatToBottom()
  })
}

const startChatPolling = async (roomId) => {
  if (chatPollingTimer) {
    clearInterval(chatPollingTimer)
  }
  const currentUserId = userStore.user?.id
  const pollMessages = async () => {
    try {
      const res = await request.get(`/chat/${encodeURIComponent(roomId)}/messages`, {
        params: { limit: 50 }
      })
      if (res.code === 200 && res.data && res.data.length > 0) {
        res.data.forEach(msg => {
          // 只处理比已知最新ID更大的消息（新消息）
          if (msg.id && msg.id > lastMessageId) {
            // 跳过自己发送的消息（已通过 addChatMessage 本地添加）
            if (msg.senderId !== currentUserId) {
              addChatMessage(msg.senderName || msg.sender, msg.content, false)
            }
            lastMessageId = msg.id
          }
        })
      }
    } catch (e) {
      console.log('轮询消息失败', e)
    }
  }
  await pollMessages()
  chatPollingTimer = setInterval(pollMessages, 1500)
}

const stopChatPolling = () => {
  if (chatPollingTimer) {
    clearInterval(chatPollingTimer)
    chatPollingTimer = null
  }
}

const sendChatMessage = async () => {
  const content = chatInput.value.trim()
  if (!content) return

  const sender = userStore.user?.realName || userStore.user?.username || t('meeting.me')
  addChatMessage(sender, content, true)

  try {
    const res = await request.post(`/chat/${encodeURIComponent(meetingForm.roomId)}/send`, {
      sender: sender,
      content: content
    })
    if (res.code !== 200) {
      ElMessage.error(res.message || '发送失败')
    }
  } catch (e) {
    console.error('发送消息失败', e)
    ElMessage.error('发送失败')
  }

  chatInput.value = ''
}

onMounted(() => {
  loadCanStart()
})

onUnmounted(() => {
  if (pageState.value === 'inMeeting') {
    leaveMeeting()
  }
  if (previewStream) {
    previewStream.stop()
    previewStream.close()
    previewStream = null
  }
  if (durationTimer) {
    clearInterval(durationTimer)
  }
})
</script>

<style scoped>
.meeting-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

/* ==================== 大厅样式 ==================== */
.meeting-lobby {
  background: #ffffff;
  border-radius: 12px;
  padding: 40px;
  border: 1px solid #e8e8e8;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: #000000;
  margin: 0 0 32px;
}

.no-permission {
  text-align: center;
  padding: 60px 0;
}

.no-permission-icon {
  color: #999;
  margin-bottom: 16px;
}

.no-permission p {
  font-size: 16px;
  color: #666;
}

.lobby-content {
  max-width: 600px;
  margin: 0 auto;
}

.scope-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px;
  background: #f8f8f8;
  border-radius: 12px;
  margin-bottom: 32px;
}

.scope-icon {
  width: 64px;
  height: 64px;
  background: #000000;
  color: #ffffff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.scope-info h3 {
  font-size: 18px;
  font-weight: 700;
  color: #000000;
  margin: 0 0 6px;
}

.scope-info p {
  font-size: 14px;
  color: #666;
  margin: 0;
}

.meeting-form {
  margin-bottom: 32px;
}

.action-buttons {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.action-buttons .el-button {
  min-width: 140px;
}

/* ==================== 预览样式 ==================== */
.meeting-preview {
  background: #1a1a2e;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px;
  min-height: 600px;
}

.preview-header {
  text-align: center;
  color: #fff;
  margin-bottom: 32px;
}

.preview-header h2 {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 8px;
}

.preview-room {
  font-size: 14px;
  color: #aaa;
  margin: 0;
}

.preview-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  flex: 1;
}

.preview-video-wrap {
  position: relative;
  width: 480px;
  height: 360px;
  background: #0f0f1a;
  border-radius: 12px;
  overflow: hidden;
}

.preview-video {
  width: 100%;
  height: 100%;
}

.preview-video :deep(video) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-camera-off {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #666;
  gap: 8px;
}

.preview-camera-off p {
  margin: 0;
  font-size: 14px;
}

.preview-controls {
  display: flex;
  gap: 20px;
}

.preview-footer {
  display: flex;
  gap: 16px;
  margin-top: 32px;
  padding-bottom: 20px;
}

/* ==================== 会议中样式 ==================== */
.meeting-room-container {
  background: #0f0f1a;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 48px);
}

.room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: #1a1a2e;
  color: #fff;
  border-bottom: 1px solid #2a2a3e;
}

.room-info {
  display: flex;
  gap: 16px;
  align-items: center;
}

.room-id {
  font-size: 14px;
  font-weight: 600;
}

.room-subject {
  font-size: 13px;
  color: #aaa;
}

.room-duration {
  font-size: 13px;
  color: #4ade80;
  font-family: monospace;
}

.room-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.room-actions .el-button {
  position: relative;
}

.chat-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #ff4d4f;
  color: #fff;
  font-size: 10px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 主体区域 */
.room-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.room-body.chat-open .video-area {
  flex: 1;
}

.video-area {
  flex: 1;
  padding: 16px;
  overflow: auto;
}

/* 视频元素通用 */
.video-element {
  width: 100%;
  height: 100%;
}

.video-element :deep(video) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-overlay {
  position: absolute;
  bottom: 8px;
  left: 8px;
  right: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 4px;
  color: #fff;
  font-size: 12px;
}

.user-name {
  font-weight: 600;
}

.user-status {
  display: flex;
  gap: 4px;
}

.status-off {
  color: #ff4d4f;
}

.pin-indicator {
  background: #8b5cf6;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
}

/* 网格布局 */
.layout-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
  height: 100%;
}

.video-item {
  position: relative;
  background: #2a2a3e;
  border-radius: 8px;
  overflow: hidden;
  min-height: 180px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.video-item:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

/* 主讲人布局 */
.layout-speaker {
  display: flex;
  gap: 12px;
  height: 100%;
}

.speaker-main {
  flex: 1;
  position: relative;
  background: #1a1a2e;
  border-radius: 8px;
  overflow: hidden;
}

.speaker-side {
  width: 200px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
}

.side-item {
  position: relative;
  height: 140px;
  background: #1a1a2e;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.side-item:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
}

.side-item-active {
  border: 2px solid #8b5cf6;
  box-shadow: 0 0 12px rgba(139, 92, 246, 0.6);
}

.side-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #666;
  gap: 8px;
  padding: 20px;
  font-size: 12px;
}

/* 画廊布局 */
.layout-gallery {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
}

.gallery-main {
  flex: 1;
  position: relative;
  background: #1a1a2e;
  border-radius: 8px;
  overflow: hidden;
}

.gallery-strip {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  height: 120px;
  padding: 4px;
}

.gallery-item {
  position: relative;
  width: 180px;
  height: 110px;
  background: #1a1a2e;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}

/* 聊天面板 */
.chat-panel {
  width: 300px;
  background: #1a1a2e;
  border-left: 1px solid #2a2a3e;
  display: flex;
  flex-direction: column;
  max-height: 100vh;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #2a2a3e;
  color: #fff;
  font-weight: 600;
}

.chat-close {
  cursor: pointer;
  color: #aaa;
  transition: color 0.2s;
}

.chat-close:hover {
  color: #fff;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chat-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #666;
  gap: 8px;
  height: 100%;
}

.chat-msg {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-width: 85%;
}

.chat-msg.self {
  align-self: flex-end;
  align-items: flex-end;
}

.chat-msg:not(.self) {
  align-self: flex-start;
}

.msg-sender {
  font-size: 11px;
  color: #888;
}

.msg-content {
  background: #2a2a3e;
  color: #fff;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  word-break: break-word;
}

.chat-msg.self .msg-content {
  background: #1677ff;
}

.msg-time {
  font-size: 10px;
  color: #666;
}

.chat-input-area {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid #2a2a3e;
}

.chat-input-area .el-input {
  flex: 1;
}

/* 底部工具栏 */
.room-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 32px;
  background: #1a1a2e;
  border-top: 1px solid #2a2a3e;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  gap: 12px;
}

.toolbar-center .el-button {
  min-width: 100px;
}

/* 本地视频高亮 */
.local-item {
  border: 2px solid #1677ff;
}

/* ==================== 移动端钉钉风格适配 ==================== */
@media (max-width: 768px) {
  .meeting-page {
    padding: 0;
    min-height: 100dvh;
    background: #000;
  }

  .meeting-lobby {
    padding: 20px 16px;
    min-height: 100dvh;
  }

  .lobby-card {
    padding: 24px 18px;
    border-radius: 16px;
  }

  .lobby-card h1 {
    font-size: 22px;
    margin-bottom: 8px;
  }

  .lobby-card p {
    font-size: 14px;
    margin-bottom: 24px;
  }

  /* ===== 预览页：钉钉入会前风格 ===== */
  .meeting-preview {
    padding: 0;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    position: relative;
    background: #0f0f1a;
  }

  .preview-header {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 10;
    padding: 16px 16px 0;
    margin: 0;
    text-align: center;
    background: linear-gradient(to bottom, rgba(0,0,0,0.5), transparent);
  }

  .preview-header h2 {
    font-size: 17px;
    margin: 0 0 2px;
    color: #fff;
    font-weight: 500;
  }

  .preview-room {
    font-size: 12px;
    color: rgba(255,255,255,0.7);
    margin: 0;
  }

  .preview-body {
    flex: 1;
    width: 100%;
    gap: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .preview-video-wrap {
    width: 100%;
    height: 100%;
    max-height: none;
    border-radius: 0;
    background: #000;
    flex: 1;
  }

  .preview-video-wrap :deep(video) {
    object-fit: cover;
  }

  .preview-camera-off {
    background: #1a1a2e;
  }

  .preview-controls {
    position: absolute;
    bottom: 100px;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    gap: 24px;
    z-index: 10;
  }

  .preview-controls .el-button {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    padding: 0;
    background: rgba(50,50,60,0.85);
    border: none;
    color: #fff;
    backdrop-filter: blur(8px);
  }

  .preview-controls .el-button.el-button--danger {
    background: rgba(245,108,108,0.9);
  }

  .preview-controls .el-button .el-icon {
    font-size: 22px;
  }

  .preview-footer {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 12px 20px;
    padding-bottom: calc(12px + env(safe-area-inset-bottom));
    display: flex;
    justify-content: center;
    gap: 12px;
    z-index: 10;
    background: linear-gradient(to top, rgba(0,0,0,0.6), transparent);
  }

  .preview-footer .el-button {
    flex: 1;
    max-width: 160px;
    height: 44px;
    border-radius: 22px;
    font-size: 15px;
    font-weight: 500;
    border: none;
  }

  .preview-footer .el-button--primary {
    background: #1677ff;
  }

  .preview-footer .el-button--default {
    background: rgba(255,255,255,0.15);
    color: #fff;
  }

  /* ===== 会议中：钉钉视频会议风格 ===== */
  .meeting-room-container {
    border-radius: 0;
    height: 100dvh;
    background: #000;
    position: relative;
  }

  /* 顶部状态栏：半透明悬浮 */
  .room-header {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 50;
    padding: 10px 14px;
    background: linear-gradient(to bottom, rgba(0,0,0,0.55), transparent);
    border-bottom: none;
    flex-wrap: nowrap;
    gap: 10px;
    align-items: flex-start;
  }

  .room-info {
    flex: 1;
    min-width: 0;
  }

  .room-id {
    font-size: 15px;
    font-weight: 500;
    color: #fff;
  }

  .room-subject {
    font-size: 12px;
    color: rgba(255,255,255,0.75);
    margin-top: 2px;
  }

  .room-duration {
    font-size: 12px;
    color: rgba(255,255,255,0.8);
    background: rgba(255,255,255,0.12);
    padding: 2px 8px;
    border-radius: 10px;
    margin-top: 4px;
    display: inline-block;
  }

  .room-actions {
    flex-shrink: 0;
    gap: 6px;
  }

  .room-actions .el-button {
    width: 34px;
    height: 34px;
    padding: 0;
    border-radius: 50%;
    background: rgba(255,255,255,0.12);
    border: none;
    color: #fff;
    font-size: 16px;
  }

  .room-actions .el-button--primary {
    background: #1677ff;
  }

  /* 主体铺满 */
  .room-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .video-area {
    flex: 1;
    padding: 0;
    min-height: 0;
    background: #000;
  }

  /* 视频覆盖层 */
  .video-overlay {
    padding: 4px 8px;
    background: linear-gradient(to top, rgba(0,0,0,0.5), transparent);
  }

  .user-name {
    font-size: 11px;
    color: #fff;
  }

  /* ========== 网格布局：根据人数动态调整 ========== */
  .layout-grid {
    display: grid;
    gap: 3px;
    height: 100%;
    width: 100%;
    padding: 3px;
    align-content: center;
    justify-content: center;
    overflow-y: auto;
  }

  .layout-grid .video-item {
    min-height: 0;
    min-width: 0;
    border-radius: 6px;
    overflow: hidden;
    position: relative;
    background: #1a1a2e;
  }

  .layout-grid .video-item :deep(video) {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  /* 1人：全屏 */
  .layout-grid.grid-layout-1 {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr;
  }
  .layout-grid.grid-layout-1 .video-item {
    aspect-ratio: 3/4;
    max-height: calc(100dvh - 100px);
  }

  /* 2人：左右各半 */
  .layout-grid.grid-layout-2 {
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: 1fr;
  }
  .layout-grid.grid-layout-2 .video-item {
    aspect-ratio: 3/4;
    max-height: calc(100dvh - 100px);
  }

  /* 3人：上面1个大，下面2个 */
  .layout-grid.grid-layout-3 {
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: 1.2fr 1fr;
  }
  .layout-grid.grid-layout-3 .video-item:first-child {
    grid-column: 1 / -1;
  }
  .layout-grid.grid-layout-3 .video-item {
    aspect-ratio: 16/9;
  }

  /* 4人：2x2 */
  .layout-grid.grid-layout-4 {
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: repeat(2, 1fr);
  }
  .layout-grid.grid-layout-4 .video-item {
    aspect-ratio: 4/3;
  }

  /* 主讲人布局 */
  .layout-speaker {
    flex-direction: column;
    gap: 0;
    height: 100%;
    padding: 3px;
  }

  .speaker-main {
    flex: 1;
    min-height: 0;
    border-radius: 6px;
    overflow: hidden;
    position: relative;
    background: #1a1a2e;
  }

  .speaker-main :deep(video) {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .speaker-side {
    position: absolute;
    right: 8px;
    top: 60px;
    width: 80px;
    height: auto;
    max-height: calc(100dvh - 200px);
    display: flex;
    flex-direction: column;
    overflow-x: hidden;
    overflow-y: auto;
    gap: 6px;
    padding: 0;
    z-index: 40;
    background: transparent;
  }

  .side-item {
    width: 80px;
    height: 106px;
    border-radius: 8px;
    flex-shrink: 0;
    background: rgba(30,30,40,0.6);
    border: 2px solid transparent;
    overflow: hidden;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    position: relative;
  }

  .side-item-active {
    border-color: #1677ff;
  }

  .side-item .user-name {
    font-size: 10px;
  }

  /* 画廊布局 */
  .layout-gallery {
    flex-direction: column;
    gap: 0;
    height: 100%;
    padding: 3px;
  }

  .gallery-main {
    flex: 1;
    min-height: 0;
    border-radius: 6px;
    overflow: hidden;
    position: relative;
    background: #1a1a2e;
  }

  .gallery-main :deep(video) {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .gallery-strip {
    position: absolute;
    right: 8px;
    top: 60px;
    width: 80px;
    height: auto;
    max-height: calc(100dvh - 200px);
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    gap: 6px;
    z-index: 40;
  }

  .gallery-item {
    width: 80px;
    height: 106px;
    border-radius: 8px;
    flex-shrink: 0;
    background: rgba(30,30,40,0.6);
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    position: relative;
    overflow: hidden;
  }

  /* ========== 底部Dock工具栏：紧凑布局 ========== */
  .room-toolbar {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 60;
    padding: 10px 12px;
    padding-bottom: calc(10px + env(safe-area-inset-bottom));
    background: linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.4) 60%, transparent);
    border-top: none;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12px;
  }

  .toolbar-left {
    display: flex;
    gap: 10px;
    flex-shrink: 0;
  }

  .toolbar-left .el-button {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    padding: 0;
    background: rgba(80,80,90,0.7);
    border: none;
    color: #fff;
    backdrop-filter: blur(6px);
    flex-shrink: 0;
  }

  .toolbar-left .el-button.el-button--danger {
    background: rgba(245,108,108,0.9);
  }

  .toolbar-left .el-button.el-button--primary {
    background: #1677ff;
  }

  .toolbar-left .el-button .el-icon {
    font-size: 18px;
  }

  .toolbar-center {
    display: block;
    flex-shrink: 0;
  }

  .toolbar-center .el-button {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    padding: 0;
    font-size: 22px;
    min-width: unset;
  }

  .toolbar-center .el-button span {
    display: none;
  }

  .toolbar-right {
    display: flex;
    gap: 10px;
    flex-shrink: 0;
  }

  .toolbar-right .el-button {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    padding: 0;
    background: rgba(80,80,90,0.7);
    border: none;
    color: #fff;
    backdrop-filter: blur(6px);
    flex-shrink: 0;
  }

  .toolbar-right .el-button.el-button--primary {
    background: #1677ff;
  }

  .toolbar-right .el-button .el-icon {
    font-size: 18px;
  }

  .toolbar-right .chat-badge {
    position: absolute;
    top: -3px;
    right: -3px;
    background: #f56c6c;
    color: #fff;
    font-size: 9px;
    min-width: 16px;
    height: 16px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 3px;
  }

  /* ========== 聊天面板：抽屉式，避开底部工具栏 ========== */
  .chat-panel {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 72px;
    width: 100%;
    height: calc(100dvh - 140px);
    max-height: 520px;
    border-radius: 16px 16px 0 0;
    z-index: 200;
    animation: slideUp 0.25s ease;
    background: #1a1a2e;
    display: flex;
    flex-direction: column;
    box-shadow: 0 -4px 24px rgba(0,0,0,0.5);
  }

  .chat-panel .chat-header {
    padding: 12px 16px;
    font-size: 15px;
    font-weight: 500;
    flex-shrink: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }

  .chat-close {
    font-size: 18px;
    cursor: pointer;
    color: rgba(255,255,255,0.7);
  }

  .chat-panel .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    -webkit-overflow-scrolling: touch;
  }

  .chat-panel .chat-input-area {
    padding: 10px 12px;
    padding-bottom: calc(10px + env(safe-area-inset-bottom));
    flex-shrink: 0;
    display: flex;
    gap: 8px;
    align-items: center;
    border-top: 1px solid rgba(255,255,255,0.08);
    background: #1a1a2e;
  }

  .chat-panel .chat-input-area .el-input {
    flex: 1;
  }

  .chat-panel .chat-input-area .el-input__wrapper {
    background: rgba(255,255,255,0.08);
    border: none;
    border-radius: 18px;
    padding: 4px 14px;
  }

  .chat-panel .chat-input-area .el-button {
    padding: 8px 16px;
    border-radius: 16px;
  }

  @keyframes slideUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }

  /* 聊天消息 */
  .chat-msg {
    max-width: 82%;
    margin-bottom: 10px;
  }

  .msg-content {
    font-size: 14px;
    padding: 8px 12px;
    border-radius: 14px;
  }

  .msg-sender {
    font-size: 11px;
    margin-bottom: 2px;
  }

  .msg-time {
    font-size: 10px;
  }

  /* 本地视频高亮 */
  .local-item {
    border: none;
  }

  .pin-indicator {
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 10px;
    background: #1677ff;
  }

  /* 空状态 */
  .chat-empty,
  .side-empty {
    font-size: 13px;
  }
}
</style>
