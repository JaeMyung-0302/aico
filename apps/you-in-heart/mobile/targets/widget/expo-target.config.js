/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = () => ({
  type: 'widget',
  name: 'DdayWidget',
  displayName: 'D-day',
  deploymentTarget: '17.0',
  colors: {
    $accent: '#CC3355',
    ink: '#17171A',
    ink3: '#6E6E78',
  },
  // App Group은 app.config.ts의 ios.entitlements를 그대로 따른다 (group.com.aico.youinheart)
})
