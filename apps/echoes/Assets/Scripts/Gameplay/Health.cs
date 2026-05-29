using System;
using UnityEngine;

namespace EchoesOfMaple.Gameplay
{
    /// <summary>
    /// 체력 컴포넌트 — 플레이어·적 공용. 피해/회복/죽음을 이벤트로 알림.
    /// ⚠️ Unity에서 컴파일/플레이 검증 전 초안.
    /// </summary>
    public class Health : MonoBehaviour
    {
        [SerializeField] private int _maxHealth = 30;

        public int MaxHealth => _maxHealth;
        public int Current { get; private set; }
        public bool IsDead => Current <= 0;

        public event Action<int, int> OnHealthChanged; // (current, max)
        public event Action OnDamaged;                 // 피해를 입은 순간 (회복 제외)
        public event Action OnDied;

        private void Awake()
        {
            Current = _maxHealth;
        }

        public void TakeDamage(int amount)
        {
            if (IsDead || amount <= 0) return;
            Current = Mathf.Max(0, Current - amount);
            OnDamaged?.Invoke();
            OnHealthChanged?.Invoke(Current, _maxHealth);
            if (Current == 0) OnDied?.Invoke();
        }

        public void Heal(int amount)
        {
            if (IsDead || amount <= 0) return;
            Current = Mathf.Min(_maxHealth, Current + amount);
            OnHealthChanged?.Invoke(Current, _maxHealth);
        }

        /// <summary>완전 부활 — 재시작용 (사망 상태에서도 최대 체력으로 복구)</summary>
        public void Revive()
        {
            Current = _maxHealth;
            OnHealthChanged?.Invoke(Current, _maxHealth);
        }

        /// <summary>업그레이드: 최대 체력 증가 + 증가분만큼 즉시 회복</summary>
        public void AddMaxHealth(int amount)
        {
            if (amount <= 0) return;
            _maxHealth += amount;
            Current += amount;
            OnHealthChanged?.Invoke(Current, _maxHealth);
        }
    }
}
