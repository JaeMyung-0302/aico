using UnityEngine;

namespace EchoesOfMaple.Gameplay
{
    /// <summary>
    /// 적 애니메이션 구동기. 평소 Walk 반복, 피격 시 Hurt 1회, 공격 시 Attack 1회 후 Walk 복귀.
    /// Animator 상태(State) 이름이 아래 필드와 일치해야 함. 비어있거나 없는 클립은 무시.
    /// ⚠️ Unity에서 컴파일/플레이 검증 전 초안.
    /// </summary>
    [RequireComponent(typeof(Animator))]
    public class EnemyAnimator : MonoBehaviour
    {
        [Header("Animator State 이름 (클립/상태 이름과 일치)")]
        [SerializeField] private string _walk = "Slime_Walk";
        [SerializeField] private string _hurt = "Slime_Hurt";
        [SerializeField] private string _attack = "Slime_Attack";

        [SerializeField] private float _oneShotHold = 0.3f; // hurt/attack 유지 시간

        private Animator _animator;
        private string _current = "";
        private float _holdUntil = -999f;

        private void Awake()
        {
            _animator = GetComponent<Animator>();
            var health = GetComponent<Health>();
            if (health != null) health.OnDamaged += PlayHurt; // 맞으면 Hurt
        }

        public void PlayHurt() => PlayOneShot(_hurt);
        public void PlayAttack() => PlayOneShot(_attack);

        private void PlayOneShot(string state)
        {
            if (string.IsNullOrEmpty(state)) return;
            _animator.Play(state);
            _current = state;
            _holdUntil = Time.time + _oneShotHold;
        }

        private void Update()
        {
            if (Time.time < _holdUntil) return; // 한방 애니 재생 중엔 유지

            if (_current != _walk && !string.IsNullOrEmpty(_walk))
            {
                _animator.Play(_walk); // 평소 상태로 복귀
                _current = _walk;
            }
        }
    }
}
