import axios from 'axios'

const request = axios.create({
  baseURL: 'https://ndidrsback-production.up.railway.app/api',
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