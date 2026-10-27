import { Redirect } from 'expo-router'

// Phase 0F 전까지는 스파이크 화면으로 바로 보낸다
const Index = () => <Redirect href="/spike" />

export default Index
