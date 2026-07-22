<template>
  <div
    ref="floatRef"
    class="xiaoye-float"
    :style="{ left: position.x + 'px', top: position.y + 'px' }"
    @mousedown="startDrag"
    @touchstart="startDrag"
    @click="handleClick"
  >
    <div class="xiaoye-container" ref="containerRef"></div>
    <div class="xiaoye-label">小夜</div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import * as THREE from 'three'

const router = useRouter()
const floatRef = ref(null)
const containerRef = ref(null)

const position = ref({ x: window.innerWidth - 120, y: window.innerHeight - 120 })
const isDragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })
let scene, camera, renderer, owl, animationId

const init = () => {
  const container = containerRef.value
  if (!container) return

  const width = 64
  const height = 64

  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
  camera.position.set(0, 0.5, 4)

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)
  container.appendChild(renderer.domElement)

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambientLight)

  const frontLight = new THREE.DirectionalLight(0xffffff, 1.0)
  frontLight.position.set(3, 3, 5)
  scene.add(frontLight)

  const backLight = new THREE.DirectionalLight(0xa78bfa, 0.5)
  backLight.position.set(-3, 2, -3)
  scene.add(backLight)

  owl = createOwl()
  scene.add(owl)

  const animate = () => {
    animationId = requestAnimationFrame(animate)
    const time = Date.now() * 0.001
    owl.position.y = Math.sin(time * 1.2) * 0.06
    owl.rotation.z = Math.sin(time * 0.8) * 0.03
    renderer.render(scene, camera)
  }
  animate()
}

const createOwl = () => {
  const owlGroup = new THREE.Group()

  const bodyMat = new THREE.MeshPhongMaterial({ color: 0xa78bfa, shininess: 60 })
  const bellyMat = new THREE.MeshPhongMaterial({ color: 0xe0d4fc, shininess: 40 })
  const faceMat = new THREE.MeshPhongMaterial({ color: 0xd8ccf8, shininess: 40 })
  const eyeWhiteMat = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0xfff8e1, emissiveIntensity: 0.2 })
  const eyePupilMat = new THREE.MeshPhongMaterial({ color: 0x1e1b4b })
  const eyeHighlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
  const beakMat = new THREE.MeshPhongMaterial({ color: 0xfbbf24, shininess: 100 })
  const blushMat = new THREE.MeshPhongMaterial({ color: 0xfca5a5, transparent: true, opacity: 0.5 })
  const earMat = new THREE.MeshPhongMaterial({ color: 0x8b5cf6, shininess: 40 })
  const footMat = new THREE.MeshPhongMaterial({ color: 0xfbbf24, shininess: 80 })

  const bodyGeo = new THREE.SphereGeometry(1, 32, 32)
  bodyGeo.scale(1, 0.95, 0.8)
  const body = new THREE.Mesh(bodyGeo, bodyMat)
  body.position.y = -0.1
  owlGroup.add(body)

  const bellyGeo = new THREE.SphereGeometry(0.7, 32, 32)
  bellyGeo.scale(0.85, 0.9, 0.45)
  const belly = new THREE.Mesh(bellyGeo, bellyMat)
  belly.position.set(0, -0.05, 0.5)
  owlGroup.add(belly)

  const headGeo = new THREE.SphereGeometry(0.85, 32, 32)
  headGeo.scale(1, 0.95, 0.9)
  const head = new THREE.Mesh(headGeo, bodyMat)
  head.position.y = 1.1
  owlGroup.add(head)

  const faceGeo = new THREE.SphereGeometry(0.6, 32, 32)
  faceGeo.scale(1, 0.9, 0.4)
  const face = new THREE.Mesh(faceGeo, faceMat)
  face.position.set(0, 1.05, 0.55)
  owlGroup.add(face)

  const earGeo = new THREE.ConeGeometry(0.18, 0.4, 12)
  const leftEar = new THREE.Mesh(earGeo, earMat)
  leftEar.position.set(-0.5, 1.75, 0)
  leftEar.rotation.z = 0.25
  owlGroup.add(leftEar)

  const rightEar = new THREE.Mesh(earGeo, earMat)
  rightEar.position.set(0.5, 1.75, 0)
  rightEar.rotation.z = -0.25
  owlGroup.add(rightEar)

  const eyeWhiteGeo = new THREE.SphereGeometry(0.25, 32, 32)
  eyeWhiteGeo.scale(1, 1.1, 0.5)
  const leftEyeWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat)
  leftEyeWhite.position.set(-0.25, 1.15, 0.7)
  owlGroup.add(leftEyeWhite)

  const rightEyeWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat)
  rightEyeWhite.position.set(0.25, 1.15, 0.7)
  owlGroup.add(rightEyeWhite)

  const pupilGeo = new THREE.SphereGeometry(0.15, 24, 24)
  pupilGeo.scale(1, 1.1, 0.4)
  const leftPupil = new THREE.Mesh(pupilGeo, eyePupilMat)
  leftPupil.position.set(-0.25, 1.15, 0.92)
  owlGroup.add(leftPupil)

  const rightPupil = new THREE.Mesh(pupilGeo, eyePupilMat)
  rightPupil.position.set(0.25, 1.15, 0.92)
  owlGroup.add(rightPupil)

  const hlGeo = new THREE.SphereGeometry(0.05, 16, 16)
  const leftHl1 = new THREE.Mesh(hlGeo, eyeHighlightMat)
  leftHl1.position.set(-0.2, 1.2, 1.02)
  owlGroup.add(leftHl1)

  const rightHl1 = new THREE.Mesh(hlGeo, eyeHighlightMat)
  rightHl1.position.set(0.3, 1.2, 1.02)
  owlGroup.add(rightHl1)

  const beakGeo = new THREE.SphereGeometry(0.08, 16, 16)
  beakGeo.scale(1, 0.8, 1.2)
  const beak = new THREE.Mesh(beakGeo, beakMat)
  beak.position.set(0, 0.95, 0.85)
  owlGroup.add(beak)

  const blushGeo = new THREE.SphereGeometry(0.12, 16, 16)
  blushGeo.scale(1, 0.6, 0.3)
  const leftBlush = new THREE.Mesh(blushGeo, blushMat)
  leftBlush.position.set(-0.45, 0.95, 0.6)
  owlGroup.add(leftBlush)

  const rightBlush = new THREE.Mesh(blushGeo, blushMat)
  rightBlush.position.set(0.45, 0.95, 0.6)
  owlGroup.add(rightBlush)

  const wingGeo = new THREE.SphereGeometry(0.35, 24, 24)
  wingGeo.scale(0.25, 0.8, 0.6)
  const leftWing = new THREE.Mesh(wingGeo, bodyMat)
  leftWing.position.set(-0.75, -0.05, 0.1)
  leftWing.rotation.z = 0.25
  owlGroup.add(leftWing)

  const rightWing = new THREE.Mesh(wingGeo, bodyMat)
  rightWing.position.set(0.75, -0.05, 0.1)
  rightWing.rotation.z = -0.25
  owlGroup.add(rightWing)

  const footGeo = new THREE.SphereGeometry(0.1, 16, 16)
  footGeo.scale(1.2, 0.5, 1.5)
  const leftFoot = new THREE.Mesh(footGeo, footMat)
  leftFoot.position.set(-0.25, -0.95, 0.15)
  owlGroup.add(leftFoot)

  const rightFoot = new THREE.Mesh(footGeo, footMat)
  rightFoot.position.set(0.25, -0.95, 0.15)
  owlGroup.add(rightFoot)

  return owlGroup
}

const startDrag = (e) => {
  e.preventDefault()
  isDragging.value = true
  
  const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX
  const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY
  
  dragOffset.value = {
    x: clientX - position.value.x,
    y: clientY - position.value.y
  }

  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  document.addEventListener('touchmove', onDrag)
  document.addEventListener('touchend', stopDrag)
}

const onDrag = (e) => {
  if (!isDragging.value) return
  
  const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX
  const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY
  
  const newX = clientX - dragOffset.value.x
  const newY = clientY - dragOffset.value.y

  const maxX = window.innerWidth - 80
  const maxY = window.innerHeight - 80

  position.value = {
    x: Math.max(0, Math.min(maxX, newX)),
    y: Math.max(0, Math.min(maxY, newY))
  }
}

const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchmove', onDrag)
  document.removeEventListener('touchend', stopDrag)
}

const handleClick = () => {
  if (!isDragging.value) {
    router.push('ai-analysis')
  }
}

onMounted(() => {
  init()
})

onBeforeUnmount(() => {
  if (animationId) cancelAnimationFrame(animationId)
  if (renderer) {
    renderer.dispose()
    containerRef.value?.removeChild(renderer.domElement)
  }
})
</script>

<style scoped>
.xiaoye-float {
  position: fixed;
  z-index: 999;
  cursor: grab;
  user-select: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.xiaoye-float:active {
  cursor: grabbing;
}

.xiaoye-container {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  box-shadow: 0 4px 16px rgba(139, 92, 246, 0.3);
  transition: box-shadow 0.2s ease;
  background: radial-gradient(circle, #e0d4fc 0%, #8b5cf6 100%);
}

.xiaoye-float:hover .xiaoye-container {
  box-shadow: 0 6px 24px rgba(139, 92, 246, 0.5);
}

.xiaoye-label {
  font-size: 12px;
  color: #6b21a8;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.9);
  padding: 2px 8px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>