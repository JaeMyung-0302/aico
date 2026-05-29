using UnityEngine;
using UnityEngine.InputSystem;

namespace EchoesOfMaple.Gameplay
{
    /// <summary>
    /// 플레이어 근접 공격 (메이플식). J/X → 주변 범위 내 적 타격 + 공격 애니. 흡혈 지원.
    /// 업그레이드용 강화 메서드 제공.
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
        private int _lifesteal = 0;
        private PlayerAnimator _animator;
        private Health _health;

        private void Awake()
        {
            _animator = GetComponent<PlayerAnimator>();
            _health = GetComponent<Health>();
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
            _animator?.PlayAttack();

            var hits = Physics2D.OverlapCircleAll(transform.position, _range);
            int hitCount = 0;
            foreach (var col in hits)
            {
                if (col.GetComponent<EnemyController>() == null) continue;
                col.GetComponent<Health>()?.TakeDamage(_damage);
                hitCount++;
            }

            if (hitCount > 0 && _lifesteal > 0)
                _health?.Heal(_lifesteal * hitCount); // 흡혈

            Debug.Log($"공격! 적 {hitCount}체 타격");
        }

        // ── 업그레이드 강화 메서드 ──
        public void AddDamage(int amount) => _damage += amount;
        public void MultiplyCooldown(float factor) => _cooldown *= factor; // 0.8 = 20% 빨라짐
        public void AddRange(float amount) => _range += amount;
        public void AddLifesteal(int amount) => _lifesteal += amount;

        private void OnDrawGizmosSelected()
        {
            Gizmos.color = Color.red;
            Gizmos.DrawWireSphere(transform.position, _range);
        }
    }
}
