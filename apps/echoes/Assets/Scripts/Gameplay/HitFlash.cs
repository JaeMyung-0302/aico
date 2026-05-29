using System.Collections;
using UnityEngine;

namespace EchoesOfMaple.Gameplay
{
    /// <summary>
    /// 피격 시 스프라이트를 잠깐 번쩍이게 하는 juice. Health가 있는 오브젝트(Player/Enemy)에 부착.
    /// Health.OnDamaged 이벤트를 구독.
    /// ⚠️ Unity에서 컴파일/플레이 검증 전 초안.
    /// </summary>
    [RequireComponent(typeof(SpriteRenderer))]
    public class HitFlash : MonoBehaviour
    {
        [SerializeField] private Color _flashColor = Color.red;
        [SerializeField] private float _duration = 0.12f;

        private SpriteRenderer _sr;
        private Color _baseColor;
        private Coroutine _routine;

        private void Awake()
        {
            _sr = GetComponent<SpriteRenderer>();
            _baseColor = _sr.color;

            var health = GetComponent<Health>();
            if (health != null) health.OnDamaged += Flash;
        }

        private void Flash()
        {
            if (_routine != null) StopCoroutine(_routine);
            _routine = StartCoroutine(FlashRoutine());
        }

        private IEnumerator FlashRoutine()
        {
            _sr.color = _flashColor;
            yield return new WaitForSeconds(_duration);
            _sr.color = _baseColor;
        }
    }
}
