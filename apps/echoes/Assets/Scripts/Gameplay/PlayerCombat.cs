using UnityEngine;
using UnityEngine.InputSystem;

namespace EchoesOfMaple.Gameplay
{
    /// <summary>
    /// 플레이어 근접 공격 (메이플식). J 또는 X 키 → 주변 범위 내 적 타격 + 공격 애니 재생.
    /// 방향성 없이 우선 주변 원형(omnidirectional) — 방향 공격은 후속.
    /// ⚠️ Unity에서 컴파일/플레이 검증 전 초안.
    /// </summary>
    [RequireComponent(typeof(PlayerController))]
    public class PlayerCombat : MonoBehaviour
    {
        [Header("공격")]
        [SerializeField] private int _damage = 10;
        [SerializeField] private float _range = 1.2f;
        [SerializeField] private float _cooldown = 0.4f;

        private float _lastAttackTime = -999f;
        private PlayerAnimator _animator;

        private void Awake()
        {
            _animator = GetComponent<PlayerAnimator>();
        }

        private void Update()
        {
            var kb = Keyboard.current;
            if (kb == null) return;

            bool attackPressed = kb.jKey.wasPressedThisFrame || kb.xKey.wasPressedThisFrame;
            if (attackPressed && Time.time >= _lastAttackTime + _cooldown)
                Attack();
        }

        private void Attack()
        {
            _lastAttackTime = Time.time;
            _animator?.PlayAttack(); // 공격 애니 1회 재생 (있으면)

            var hits = Physics2D.OverlapCircleAll(transform.position, _range);
            int hitCount = 0;
            foreach (var col in hits)
            {
                if (col.GetComponent<EnemyController>() == null) continue;
                col.GetComponent<Health>()?.TakeDamage(_damage);
                hitCount++;
            }
            Debug.Log($"공격! 적 {hitCount}체 타격");
        }

        // Scene 뷰에서 공격 범위 시각화 (선택 시)
        private void OnDrawGizmosSelected()
        {
            Gizmos.color = Color.red;
            Gizmos.DrawWireSphere(transform.position, _range);
        }
    }
}
