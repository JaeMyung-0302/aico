using UnityEngine;
using UnityEngine.InputSystem;

namespace EchoesOfMaple.Gameplay
{
    /// <summary>
    /// 2D 플랫포머 플레이어 컨트롤러 (메이플식 좌우 이동 + 점프 + 중력).
    /// 새 Input System 사용. 바닥 감지는 발밑 박스 오버랩(옆 충돌에 영향 안 받아 안정적).
    /// Health 있으면 사망 시 입력 정지. juice: 방향 뒤집기 + 점프/착지 스쿼시.
    ///
    /// 셋업: Player에 Rigidbody2D + Collider2D + SpriteRenderer + 이 스크립트.
    /// ⚠️ Unity에서 컴파일/플레이 검증 전 초안.
    /// </summary>
    [RequireComponent(typeof(Rigidbody2D))]
    public class PlayerController : MonoBehaviour
    {
        [Header("이동")]
        [SerializeField] private float _moveSpeed = 7f;
        [SerializeField] private float _jumpForce = 12f;

        [Header("juice")]
        [SerializeField] private float _squashRecover = 12f; // 스쿼시 복원 속도(클수록 빨리 원상복귀)

        private Rigidbody2D _rb;
        private Collider2D _collider;
        private Health _health;
        private SpriteRenderer _sprite;
        private Vector3 _baseScale;
        private float _moveInput;
        private bool _isGrounded;
        private bool _wasGrounded;

        public bool IsGrounded => _isGrounded;
        public bool IsMovingInput => Mathf.Abs(_moveInput) > 0.01f;

        // 업그레이드: 이동 속도 증가
        public void AddMoveSpeed(float amount) => _moveSpeed += amount;

        private void Awake()
        {
            _rb = GetComponent<Rigidbody2D>();
            _collider = GetComponent<Collider2D>();
            _health = GetComponent<Health>();
            _sprite = GetComponent<SpriteRenderer>();
            _baseScale = transform.localScale;

            if (_health != null)
            {
                _health.OnHealthChanged += (cur, max) => Debug.Log($"플레이어 HP: {cur}/{max}");
                _health.OnDied += () => Debug.Log("플레이어 사망!");
            }
        }

        private void Update()
        {
            var kb = Keyboard.current;
            if (kb == null) return; // 키보드 없으면 무시

            // 발밑 박스로 바닥 감지 (옆에서 적이 밀어도 영향 없음)
            _isGrounded = CheckGround();

            // 사망 시 입력 정지
            if (_health != null && _health.IsDead)
            {
                _moveInput = 0f;
                return;
            }

            // 좌우 입력 (A/D 또는 화살표)
            _moveInput = 0f;
            if (kb.aKey.isPressed || kb.leftArrowKey.isPressed)  _moveInput -= 1f;
            if (kb.dKey.isPressed || kb.rightArrowKey.isPressed) _moveInput += 1f;

            // 이동 방향 따라 스프라이트 뒤집기
            if (_sprite != null && _moveInput != 0f)
                _sprite.flipX = _moveInput < 0f;

            // 점프 (Space / W / 위 화살표) — 바닥에 있을 때만
            bool jumpPressed = kb.spaceKey.wasPressedThisFrame
                            || kb.wKey.wasPressedThisFrame
                            || kb.upArrowKey.wasPressedThisFrame;
            if (jumpPressed && _isGrounded)
            {
                _rb.linearVelocity = new Vector2(_rb.linearVelocity.x, _jumpForce);
                transform.localScale = Squash(0.8f, 1.2f); // 점프 = 세로로 쭉
            }

            // 착지 순간 → 납작 스쿼시
            if (_isGrounded && !_wasGrounded)
                transform.localScale = Squash(1.2f, 0.8f);
            _wasGrounded = _isGrounded;

            // 스쿼시 → 원래 크기로 부드럽게 복귀
            transform.localScale = Vector3.Lerp(transform.localScale, _baseScale, Time.deltaTime * _squashRecover);
        }

        private void FixedUpdate()
        {
            // 수평 속도만 제어 (수직은 중력/점프가 관리)
            _rb.linearVelocity = new Vector2(_moveInput * _moveSpeed, _rb.linearVelocity.y);
        }

        private Vector3 Squash(float xMul, float yMul)
            => new Vector3(_baseScale.x * xMul, _baseScale.y * yMul, _baseScale.z);

        // 발밑 얇은 박스에 (자기 자신/트리거 제외) 콜라이더가 있으면 '바닥에 섬'
        private bool CheckGround()
        {
            if (_collider == null) return false;
            Bounds b = _collider.bounds;
            Vector2 center = new Vector2(b.center.x, b.min.y);
            Vector2 size = new Vector2(b.size.x * 0.9f, 0.15f);

            foreach (var h in Physics2D.OverlapBoxAll(center, size, 0f))
            {
                if (h == _collider || h.isTrigger) continue;
                return true;
            }
            return false;
        }
    }
}
