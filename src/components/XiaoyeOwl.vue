<template>
  <div class="owl-wrapper">
    <div ref="containerRef" class="owl-3d-container"></div>
    <div ref="fallbackRef" class="owl-fallback" style="display:none;">
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="owl-svg">
        <circle cx="100" cy="100" r="90" fill="#1e1b4b"/>
        <circle cx="100" cy="108" r="50" fill="#8b5cf6"/>
        <circle cx="100" cy="98" r="38" fill="#c4b5fd"/>
        <circle cx="100" cy="78" r="32" fill="#8b5cf6"/>
        <polygon points="72,60 68,38 82,54" fill="#7c3aed"/>
        <polygon points="128,60 132,38 118,54" fill="#7c3aed"/>
        <circle cx="86" cy="76" r="14" fill="#fef3c7"/>
        <circle cx="114" cy="76" r="14" fill="#fef3c7"/>
        <circle cx="86" cy="76" r="7" fill="#1e1b4b"/>
        <circle cx="114" cy="76" r="7" fill="#1e1b4b"/>
        <circle cx="83" cy="73" r="3" fill="#fff"/>
        <circle cx="111" cy="73" r="3" fill="#fff"/>
        <polygon points="100,86 95,94 105,94" fill="#fbbf24"/>
        <path d="M 82,98 Q 100,105 118,98" stroke="#7c3aed" stroke-width="2" fill="none"/>
      </svg>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import * as THREE from 'three'

const containerRef = ref(null)
const fallbackRef = ref(null)
let scene, camera, renderer, owl, animationId
let mouseX = 0, mouseY = 0
let targetRotationX = 0, targetRotationY = 0

const createOwl = () => {
  const owlGroup = new THREE.Group()

  // 萌版配色 - 柔和紫色系
  const bodyMat = new THREE.MeshPhongMaterial({ color: 0xa78bfa, flatShading: false, shininess: 60 })
  const bellyMat = new THREE.MeshPhongMaterial({ color: 0xe0d4fc, flatShading: false, shininess: 40 })
  const faceMat = new THREE.MeshPhongMaterial({ color: 0xd8ccf8, flatShading: false, shininess: 40 })
  const eyeWhiteMat = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0xfff8e1, emissiveIntensity: 0.2 })
  const eyePupilMat = new THREE.MeshPhongMaterial({ color: 0x1e1b4b })
  const eyeHighlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
  const beakMat = new THREE.MeshPhongMaterial({ color: 0xfbbf24, flatShading: false, shininess: 100 })
  const blushMat = new THREE.MeshPhongMaterial({ color: 0xfca5a5, transparent: true, opacity: 0.5 })
  const earMat = new THREE.MeshPhongMaterial({ color: 0x8b5cf6, flatShading: false, shininess: 40 })
  const footMat = new THREE.MeshPhongMaterial({ color: 0xfbbf24, flatShading: false, shininess: 80 })

  // 身体 - 更圆更胖
  const bodyGeo = new THREE.SphereGeometry(1, 32, 32)
  bodyGeo.scale(1, 0.95, 0.8)
  const body = new THREE.Mesh(bodyGeo, bodyMat)
  body.position.y = -0.1
  owlGroup.add(body)

  // 肚皮 - 更大更圆
  const bellyGeo = new THREE.SphereGeometry(0.7, 32, 32)
  bellyGeo.scale(0.85, 0.9, 0.45)
  const belly = new THREE.Mesh(bellyGeo, bellyMat)
  belly.position.set(0, -0.05, 0.5)
  owlGroup.add(belly)

  // 头部 - 更大更圆（萌版大头）
  const headGeo = new THREE.SphereGeometry(0.85, 32, 32)
  headGeo.scale(1, 0.95, 0.9)
  const head = new THREE.Mesh(headGeo, bodyMat)
  head.position.y = 1.1
  owlGroup.add(head)

  // 面盘 - 猫头鹰特征面部圆盘
  const faceGeo = new THREE.SphereGeometry(0.6, 32, 32)
  faceGeo.scale(1, 0.9, 0.4)
  const face = new THREE.Mesh(faceGeo, faceMat)
  face.position.set(0, 1.05, 0.55)
  owlGroup.add(face)

  // 耳朵 - 更小更圆的角
  const earGeo = new THREE.ConeGeometry(0.18, 0.4, 12)
  const leftEar = new THREE.Mesh(earGeo, earMat)
  leftEar.position.set(-0.5, 1.75, 0)
  leftEar.rotation.z = 0.25
  owlGroup.add(leftEar)

  const rightEar = new THREE.Mesh(earGeo, earMat)
  rightEar.position.set(0.5, 1.75, 0)
  rightEar.rotation.z = -0.25
  owlGroup.add(rightEar)

  // 大眼睛 - 萌版核心！超大圆眼
  const eyeWhiteGeo = new THREE.SphereGeometry(0.25, 32, 32)
  eyeWhiteGeo.scale(1, 1.1, 0.5)
  const leftEyeWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat)
  leftEyeWhite.position.set(-0.25, 1.15, 0.7)
  owlGroup.add(leftEyeWhite)

  const rightEyeWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat)
  rightEyeWhite.position.set(0.25, 1.15, 0.7)
  owlGroup.add(rightEyeWhite)

  // 瞳孔 - 大黑瞳更萌
  const pupilGeo = new THREE.SphereGeometry(0.15, 24, 24)
  pupilGeo.scale(1, 1.1, 0.4)
  const leftPupil = new THREE.Mesh(pupilGeo, eyePupilMat)
  leftPupil.position.set(-0.25, 1.15, 0.92)
  owlGroup.add(leftPupil)

  const rightPupil = new THREE.Mesh(pupilGeo, eyePupilMat)
  rightPupil.position.set(0.25, 1.15, 0.92)
  owlGroup.add(rightPupil)

  // 眼睛高光 - 两个小白点更萌
  const hlGeo = new THREE.SphereGeometry(0.05, 16, 16)
  const leftHl1 = new THREE.Mesh(hlGeo, eyeHighlightMat)
  leftHl1.position.set(-0.2, 1.2, 1.02)
  owlGroup.add(leftHl1)

  const rightHl1 = new THREE.Mesh(hlGeo, eyeHighlightMat)
  rightHl1.position.set(0.3, 1.2, 1.02)
  owlGroup.add(rightHl1)

  const leftHl2 = new THREE.Mesh(hlGeo, eyeHighlightMat)
  leftHl2.position.set(-0.3, 1.1, 1.02)
  owlGroup.add(leftHl2)

  const rightHl2 = new THREE.Mesh(hlGeo, eyeHighlightMat)
  rightHl2.position.set(0.2, 1.1, 1.02)
  owlGroup.add(rightHl2)

  // 喙 - 小巧可爱
  const beakGeo = new THREE.SphereGeometry(0.08, 16, 16)
  beakGeo.scale(1, 0.8, 1.2)
  const beak = new THREE.Mesh(beakGeo, beakMat)
  beak.position.set(0, 0.95, 0.85)
  owlGroup.add(beak)

  // 腮红 - 萌版关键！
  const blushGeo = new THREE.SphereGeometry(0.12, 16, 16)
  blushGeo.scale(1, 0.6, 0.3)
  const leftBlush = new THREE.Mesh(blushGeo, blushMat)
  leftBlush.position.set(-0.45, 0.95, 0.6)
  owlGroup.add(leftBlush)

  const rightBlush = new THREE.Mesh(blushGeo, blushMat)
  rightBlush.position.set(0.45, 0.95, 0.6)
  owlGroup.add(rightBlush)

  // 翅膀 - 小巧贴身
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

  // 小脚
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

const init = () => {
  const container = containerRef.value
  const fallback = fallbackRef.value
  if (!container) return

  // 检查WebGL支持
  try {
    const testCanvas = document.createElement('canvas')
    const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl')
    if (!gl) {
      // WebGL不支持，显示SVG回退
      container.style.display = 'none'
      fallback.style.display = 'flex'
      return
    }
  } catch (e) {
    container.style.display = 'none'
    fallback.style.display = 'flex'
    return
  }

  const width = container.clientWidth
  const height = container.clientHeight

  if (width === 0 || height === 0) {
    container.style.display = 'none'
    fallback.style.display = 'flex'
    return
  }

  try {
    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100)
    camera.position.set(0, 0.5, 5.5)

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

    const topLight = new THREE.DirectionalLight(0xd8ccf8, 0.3)
    topLight.position.set(0, 5, 2)
    scene.add(topLight)

    owl = createOwl()
    owl.position.y = 0
    scene.add(owl)

    const animate = () => {
      animationId = requestAnimationFrame(animate)

      targetRotationX += (mouseY - targetRotationX) * 0.04
      targetRotationY += (mouseX - targetRotationY) * 0.04

      owl.rotation.x = targetRotationX * 0.2
      owl.rotation.y = targetRotationY * 0.4

      const time = Date.now() * 0.001
      owl.position.y = Math.sin(time * 1.2) * 0.06
      // 小幅度左右摇晃
      owl.rotation.z = Math.sin(time * 0.8) * 0.03

      renderer.render(scene, camera)
    }
    animate()
  } catch (e) {
    console.error('3D初始化失败，使用SVG回退', e)
    container.style.display = 'none'
    fallback.style.display = 'flex'
  }
}

const handleMouseMove = (e) => {
  const container = containerRef.value
  if (!container) return
  const rect = container.getBoundingClientRect()
  mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1
  mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1
}

const handleTouchMove = (e) => {
  if (!e.touches[0]) return
  const container = containerRef.value
  if (!container) return
  const rect = container.getBoundingClientRect()
  mouseX = ((e.touches[0].clientX - rect.left) / rect.width) * 2 - 1
  mouseY = -((e.touches[0].clientY - rect.top) / rect.height) * 2 + 1
}

const handleResize = () => {
  const container = containerRef.value
  if (!container || !camera || !renderer) return
  const width = container.clientWidth
  const height = container.clientHeight
  if (width === 0 || height === 0) return
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

onMounted(() => {
  init()
  window.addEventListener('resize', handleResize)
  containerRef.value?.addEventListener('mousemove', handleMouseMove)
  containerRef.value?.addEventListener('touchmove', handleTouchMove, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  containerRef.value?.removeEventListener('mousemove', handleMouseMove)
  containerRef.value?.removeEventListener('touchmove', handleTouchMove)
  if (animationId) cancelAnimationFrame(animationId)
  if (renderer) {
    renderer.dispose()
    containerRef.value?.removeChild(renderer.domElement)
  }
})
</script>

<style scoped>
.owl-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
}

.owl-3d-container {
  width: 100%;
  height: 100%;
  cursor: grab;
}

.owl-3d-container:active {
  cursor: grabbing;
}

.owl-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.owl-svg {
  width: 80%;
  height: 80%;
}
</style>
