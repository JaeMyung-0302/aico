/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = () => ({
  type: 'widget',
  name: 'DdayWidget',
  displayName: 'D-day',
  deploymentTarget: '17.0',
  // 위젯 색은 asset catalog 로만 쓴다(index.swift Color("…")). 값은 SCR-00 tokens.json 과 같다
  colors: {
    $accent: '#CC3355',
    accent: '#CC3355',
    bg: '#FFFFFF',
    ink: '#17171A',
    ink2: '#4A4A52',
    ink3: '#6E6E78',
    // tokens.json colors.photoPlaceholder[0] — medium 위젯 대표 사진 자리
    photo: '#E8E2DA',
  },
  // App Group은 app.config.ts의 ios.entitlements를 그대로 따른다 (group.com.aico.youinheart)
})
