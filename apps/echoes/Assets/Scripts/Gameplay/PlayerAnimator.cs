using UnityEngine;

namespace EchoesOfMaple.Gameplay
{
    /// <summary>
    /// 플레이어 애니메이션 구동기. Animator 상태(클립)를 코드로 직접 재생 — 전환 그래프 불필요.
    /// 판단: 공중이면 jump, 바닥에서 키 입력 중이면 run, 그 외 idle.
    /// 공격은 PlayerCombat이 PlayAttack()을 호출 → 1회 재생 후 locomotion 복귀.
    /// 클립(State) 이름이 아래 문자열과 일치해야 함.
    /// ⚠️ Unity에서 컴파일/플레이 검증 전 초안.
    /// </summary>
    [RequireComponent(typeof(Animator))]
    [RequireComponent(typeof(PlayerController))]
    public class PlayerAnimator : MonoBehaviour
    {
        [Header("Animator State 이름 (클립 이름과 일치)")]
        [SerializeField] private string _idle = "Player_Idle";
        [SerializeField] private string _run  = "Player_Run";
        [SerializeField] private string _jump = "Player_Jump";
        [SerializeField] private string _attack = "Player_Attack";

        [Header("공격")]
        [SerializeField] private float _attackHold = 0.4f; // 이 시간 동안 locomotion이 공격을 안 덮어씀(공격 클립 길이에 맞춰 조정)

        private Animator _animator;
        private PlayerController _player;
        private string _current = "";
        private float _attackUntil = -999f;

        private void Awake()
        {
            _animator = GetComponent<Animator>();
            _player = GetComponent<PlayerController>();
        }

        /// <summary>PlayerCombat이 공격 시 호출 — 공격 애니 1회 재생</summary>
        public void PlayAttack()
        {
            _animator.Play(_attack);
            _current = _attack;
            _attackUntil = Time.time + _attackHold;
        }

        private void Update()
        {
            if (Time.time < _attackUntil) return; // 공격 재생 중엔 locomotion 보류

            string next;
            if (!_player.IsGrounded)        next = _jump; // 공중(점프/낙하)
            else if (_player.IsMovingInput) next = _run;  // 바닥에서 이동키 입력
            else                            next = _idle; // 정지

            Play(next);
        }

        private void Play(string state)
        {
            if (_current == state) return; // 같은 상태 반복 재생 방지
            _animator.Play(state);
            _current = state;
        }
    }
}
