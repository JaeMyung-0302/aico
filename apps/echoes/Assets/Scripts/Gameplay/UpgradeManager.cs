using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace EchoesOfMaple.Gameplay
{
    /// <summary>
    /// 업그레이드 풀 관리 + 선택 제공. 전투 방 클리어 시 RunManager가 OfferRoutine 호출.
    /// 3개 무작위 제시 → 플레이어 선택(시간정지) → 적용.
    /// ⚠️ Unity에서 컴파일/플레이 검증 전 초안.
    /// </summary>
    public class UpgradeManager : MonoBehaviour
    {
        [SerializeField] private UpgradeUI _ui;

        private readonly List<Upgrade> _pool = new List<Upgrade>();

        private void Awake()
        {
            var pc = FindAnyObjectByType<PlayerController>();
            if (pc == null) return;
            var combat = pc.GetComponent<PlayerCombat>();
            var health = pc.GetComponent<Health>();

            _pool.Add(new Upgrade("공격력 강화", "데미지 +5",        () => combat?.AddDamage(5)));
            _pool.Add(new Upgrade("공격 속도",   "쿨다운 -20%",      () => combat?.MultiplyCooldown(0.8f)));
            _pool.Add(new Upgrade("최대 체력",   "최대 HP +15 (회복)", () => health?.AddMaxHealth(15)));
            _pool.Add(new Upgrade("이동 속도",   "이동속도 +1.5",     () => pc.AddMoveSpeed(1.5f)));
            _pool.Add(new Upgrade("흡혈",        "타격 시 HP +2",     () => combat?.AddLifesteal(2)));
            _pool.Add(new Upgrade("공격 범위",   "범위 +0.4",        () => combat?.AddRange(0.4f)));
        }

        /// <summary>3개 제시 → 선택까지 대기 → 적용 (RunManager가 yield return으로 호출)</summary>
        public IEnumerator OfferRoutine()
        {
            if (_ui == null || _pool.Count == 0) yield break;

            var choices = PickThree();
            _ui.Show(choices);
            Time.timeScale = 0f; // 선택 동안 게임 정지

            int picked = -1;
            while (picked < 0)
            {
                picked = _ui.PickedIndex;
                yield return null; // timeScale 0에서도 프레임은 진행됨
            }

            Time.timeScale = 1f;
            _ui.Hide();
            choices[picked].Apply?.Invoke();
            Debug.Log($"업그레이드 선택: {choices[picked].Name}");
        }

        private List<Upgrade> PickThree()
        {
            var copy = new List<Upgrade>(_pool);
            var result = new List<Upgrade>();
            int n = Mathf.Min(3, copy.Count);
            for (int i = 0; i < n; i++)
            {
                int idx = Random.Range(0, copy.Count);
                result.Add(copy[idx]);
                copy.RemoveAt(idx);
            }
            return result;
        }
    }
}
