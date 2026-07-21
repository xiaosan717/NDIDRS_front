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
          <div v-if="layoutMode === 'grid'" class="layout-grid">
            <div class="video-item local-item">
              <div ref="localVideoRef" class="video-element"></div>
              <div class="video-overlay">
                <span class="user-name">{{ userStore.user?.realName || userStore.user?.username }} ({{ t('meeting.me') }})</span>
                <div class="user-status">
                  <el-icon v-if="!micEnabled" class="status-off"><Mute /></el-icon>
                  <el-icon v-if="!cameraEnabled" class="status-off"><VideoPause /></el-icon>
                </div>
              </div>
            </div>
            <div v-for="remote in remoteUsers" :key="remote.getUserId()" class="video-item">
              <div :ref="el => setRemoteVideoRef(el, remote.getUserId())" class="video-element"></div>
              <div class="video-overlay">
                <span class="user-name">{{ remote.getUserId() }}</span>
              </div>
            </div>
          </div>

          <!-- 主讲人布局 -->
          <div v-else-if="layoutMode === 'speaker'" class="layout-speaker">
            <div class="speaker-main">
              <div ref="localVideoRef" class="video-element"></div>
              <div class="video-overlay">
                <span class="user-name">{{ userStore.user?.realName || userStore.user?.username }} ({{ t('meeting.me') }})</span>
                <div class="user-status">
                  <el-icon v-if="!micEnabled" class="status-off"><Mute /></el-icon>
                  <el-icon v-if="!cameraEnabled" class="status-off"><VideoPause /></el-icon>
                </div>
              </div>
            </div>
            <div class="speaker-side">
              <div v-for="remote in remoteUsers" :key="remote.getUserId()" class="side-item">
                <div :ref="el => setRemoteVideoRef(el, remote.getUserId())" class="video-element"></div>
                <div class="video-overlay">
                  <span class="user-name">{{ remote.getUserId() }}</span>
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

// 会议相关
const localVideoRef = ref(null)
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

// 聊天
const showChatPanel = ref(false)
const chatMessages = ref([])
const chatInput = ref('')
const chatMessagesRef = ref(null)
const unreadCount = ref(0)

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

const togglePreviewMic = async () => {
  if (!previewStream) return
  try {
    // 如果要关闭麦克风，且摄像头已关闭，则不允许关闭（必须保留一个）
    if (previewMicEnabled.value && !previewCameraEnabled.value) {
      ElMessage.warning('至少需要保持麦克风或摄像头开启')
      return
    }
    if (previewMicEnabled.value) {
      await previewStream.muteAudio()
      previewMicEnabled.value = false
    } else {
      await previewStream.unmuteAudio()
      previewMicEnabled.value = true
    }
  } catch (e) {
    console.error('切换预览麦克风失败', e)
  }
}

const togglePreviewCamera = async () => {
  if (!previewStream) return
  try {
    // 如果要关闭摄像头，且麦克风已关闭，则不允许关闭（必须保留一个）
    if (previewCameraEnabled.value && !previewMicEnabled.value) {
      ElMessage.warning('至少需要保持麦克风或摄像头开启')
      return
    }
    if (previewCameraEnabled.value) {
      await previewStream.muteVideo()
      previewCameraEnabled.value = false
    } else {
      await previewStream.unmuteVideo()
      previewCameraEnabled.value = true
    }
  } catch (e) {
    console.error('切换预览摄像头失败', e)
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
    await localStream.play(localVideoRef.value)
    await trtcClient.publish(localStream)

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
        try {
          remoteUser.play(el)
        } catch (e) {
          console.error('播放远端视频失败', e)
        }
      })
    }
  }
}

const toggleMic = async () => {
  if (!localStream) return
  try {
    if (micEnabled.value) {
      await localStream.muteAudio()
      micEnabled.value = false
    } else {
      await localStream.unmuteAudio()
      micEnabled.value = true
    }
  } catch (e) {
    console.error('切换麦克风失败', e)
  }
}

const toggleCamera = async () => {
  if (!localStream) return
  try {
    if (cameraEnabled.value) {
      await localStream.muteVideo()
      cameraEnabled.value = false
    } else {
      await localStream.unmuteVideo()
      cameraEnabled.value = true
    }
  } catch (e) {
    console.error('切换摄像头失败', e)
  }
}

const toggleScreenShare = async () => {
  if (!trtcClient) return
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
      await screenStream.initialize()
      await trtcClient.publish(screenStream)
      screenSharing.value = true
      ElMessage.success(t('meeting.screenShare'))
    }
  } catch (e) {
    console.error('屏幕共享失败', e)
    ElMessage.error('屏幕共享失败: ' + (e.message || ''))
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

const sendChatMessage = () => {
  const content = chatInput.value.trim()
  if (!content) return
  addChatMessage(userStore.user?.realName || userStore.user?.username || t('meeting.me'), content, true)
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

/* 网格布局 */
.layout-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
  height: 100%;
}

.video-item {
  position: relative;
  background: #1a1a2e;
  border-radius: 8px;
  overflow: hidden;
  min-height: 200px;
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

/* 响应式 */
@media (max-width: 768px) {
  .meeting-page {
    padding: 12px;
  }

  .meeting-lobby {
    padding: 20px;
  }

  .preview-video-wrap {
    width: 100%;
    height: 240px;
  }

  .layout-grid {
    grid-template-columns: 1fr;
  }

  .layout-speaker {
    flex-direction: column;
  }

  .speaker-side {
    width: 100%;
    flex-direction: row;
    height: 120px;
  }

  .side-item {
    width: 160px;
    height: 100px;
  }

  .chat-panel {
    width: 100%;
    position: absolute;
    right: 0;
    top: 48px;
    bottom: 72px;
    z-index: 10;
  }

  .room-toolbar {
    padding: 12px 16px;
  }
}
</style>
