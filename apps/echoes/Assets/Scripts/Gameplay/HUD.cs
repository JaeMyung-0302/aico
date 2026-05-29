using UnityEngine;
using UnityEngine.UI;
using TMPro;

namespace EchoesOfMaple.Gameplay
{
    /// <summary>
    /// 화면 HUD — 플레이어 체력바(Fill Image) + 현재 층(TMP Text).
    /// Canvas 아래 오브젝트에 부착하고, 체력 Fill Image와 층 Text를 Inspector에서 연결.
    /// 플레이어 Health / RunManager는 자동 탐색.
    /// ⚠️ Unity에서 컴파일/플레이 검증 전 초안.
    /// </summary>
    public class HUD : MonoBehaviour
    {
        [Header("연결")]
        [SerializeField] private Image _healthFill;   // Image Type = Filled (Horizontal)
        [SerializeField] private TMP_Text _floorText;

        private Health _playerHealth;
        private RunManager _run;

        private void Start()
        {
            var pc = FindAnyObjectByType<PlayerController>();
            if (pc != null) _playerHealth = pc.GetComponent<Health>();
            _run = FindAnyObjectByType<RunManager>();

            if (_playerHealth != null)
            {
                _playerHealth.OnHealthChanged += UpdateHealth;
                UpdateHealth(_playerHealth.Current, _playerHealth.MaxHealth); // 초기값
            }
        }

        private void UpdateHealth(int current, int max)
        {
            if (_healthFill != null)
                _healthFill.fillAmount = max > 0 ? (float)current / max : 0f;
        }

        private void Update()
        {
            if (_floorText != null && _run != null)
                _floorText.text = $"Floor {_run.Floor}";
        }
    }
}
