import axios from 'axios'

const baseURL = import.meta.env.VUE_APP_API_BASE_URL

const request = axios.create({
  baseURL: baseURL,
  timeout: 10000
})

request.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}, error => {
  return Promise.reject(error)
})

request.interceptors.response.use(response => {
  if (response.config.responseType === 'blob') {
    return response.data
  }
  return response.data
}, error => {
  return Promise.reject(error)
})

export default request