using UnityEngine;

namespace EchoesOfMaple.Gameplay
{
    /// <summary>
    /// 적 머리 위 체력바. 자식 Fill 스프라이트를 HP 비율로 가로 스케일(왼쪽 고정으로 줄어듦).
    /// 같은 오브젝트에 Health 필요. Fill에는 자식 스프라이트(빨간 바)를 연결.
    /// ⚠️ Unity에서 컴파일/플레이 검증 전 초안.
    /// </summary>
    [RequireComponent(typeof(Health))]
    public class EnemyHealthBar : MonoBehaviour
    {
        [SerializeField] private Transform _fill; // 체력 채움 스프라이트(자식)

        private Vector3 _baseScale;
        private Vector3 _baseLocalPos;

        private void Awake()
        {
            if (_fill != null)
            {
                _baseScale = _fill.localScale;
                _baseLocalPos = _fill.localPosition;
            }
            var health = GetComponent<Health>();
            if (health != null) health.OnHealthChanged += UpdateBar;
        }

        private void UpdateBar(int current, int max)
        {
            if (_fill == null || max <= 0) return;

            float ratio = Mathf.Clamp01((float)current / max);
            // 가로만 비율로 줄이고, 왼쪽 끝이 고정되도록 위치 보정
            _fill.localScale = new Vector3(_baseScale.x * ratio, _baseScale.y, _baseScale.z);
            _fill.localPosition = _baseLocalPos + new Vector3(-_baseScale.x * (1f - ratio) * 0.5f, 0f, 0f);
        }
    }
}
