using System.Collections.Generic;
using System.Text;
using UnityEngine;
using UnityEngine.InputSystem;
using TMPro;

namespace EchoesOfMaple.Gameplay
{
    /// <summary>
    /// 업그레이드 선택 화면. 패널 + 텍스트로 3개 표시, 키 1/2/3로 선택.
    /// 패널은 평소 비활성, Show 시 활성화.
    /// ⚠️ Unity에서 컴파일/플레이 검증 전 초안.
    /// </summary>
    public class UpgradeUI : MonoBehaviour
    {
        [SerializeField] private GameObject _panel; // 선택 패널 (기본 비활성)
        [SerializeField] private TMP_Text _text;    // 옵션 표시 텍스트

        public int PickedIndex { get; private set; } = -1;
        private int _count = 0;

        private void Awake()
        {
            if (_panel != null) _panel.SetActive(false);
        }

        public void Show(List<Upgrade> options)
        {
            PickedIndex = -1;
            _count = options.Count;

            if (_text != null)
            {
                var sb = new StringBuilder();
                sb.AppendLine("업그레이드 선택 (1 / 2 / 3)");
                for (int i = 0; i < options.Count; i++)
                    sb.AppendLine($"[{i + 1}] {options[i].Name} — {options[i].Description}");
                _text.text = sb.ToString();
            }

            if (_panel != null) _panel.SetActive(true);
        }

        public void Hide()
        {
            if (_panel != null) _panel.SetActive(false);
        }

        private void Update()
        {
            if (_panel == null || !_panel.activeSelf) return;
            var kb = Keyboard.current;
            if (kb == null) return;

            if (_count >= 1 && kb.digit1Key.wasPressedThisFrame) PickedIndex = 0;
            else if (_count >= 2 && kb.digit2Key.wasPressedThisFrame) PickedIndex = 1;
            else if (_count >= 3 && kb.digit3Key.wasPressedThisFrame) PickedIndex = 2;
        }
    }
}
