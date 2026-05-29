using UnityEngine;

namespace EchoesOfMaple.Gameplay
{
    /// <summary>
    /// 간단한 적 — 플레이어 쪽으로 수평 이동(추격), 닿으면 주기적 접촉 피해.
    /// 이동 방향 따라 스프라이트 뒤집기. Health가 0이 되면 자기 제거.
    /// EnemyAnimator가 있으면 공격 시 Attack 애니 재생.
    /// 같은 오브젝트에 Rigidbody2D + Health 필요.
    /// ⚠️ Unity에서 컴파일/플레이 검증 전 초안.
    /// </summary>
    [RequireComponent(typeof(Rigidbody2D))]
    [RequireComponent(typeof(Health))]
    public class EnemyController : MonoBehaviour
    {
        [Header("이동")]
        [SerializeField] private float _moveSpeed = 2.5f;

        [Header("접촉 피해")]
        [SerializeField] private int _contactDamage = 5;
        [SerializeField] private float _damageInterval = 1f;

        private Rigidbody2D _rb;
        private SpriteRenderer _sprite;
        private EnemyAnimator _animator;
        private Transform _player;
        private float _lastDamageTime = -999f;

        private void Awake()
        {
            _rb = GetComponent<Rigidbody2D>();
            _sprite = GetComponent<SpriteRenderer>();
            _animator = GetComponent<EnemyAnimator>();
            var pc = FindAnyObjectByType<PlayerController>();
            if (pc != null) _player = pc.transform;
            GetComponent<Health>().OnDied += HandleDeath;
        }

        private void FixedUpdate()
        {
            if (_player == null) return;

            // 플레이어 쪽으로 수평 이동 (수직은 중력이 관리)
            float dir = Mathf.Sign(_player.position.x - transform.position.x);
            _rb.linearVelocity = new Vector2(dir * _moveSpeed, _rb.linearVelocity.y);

            // 이동 방향 따라 뒤집기
            if (_sprite != null && dir != 0f)
                _sprite.flipX = dir < 0f;
        }

        private void OnCollisionStay2D(Collision2D collision)
        {
            if (collision.collider.GetComponent<PlayerController>() == null) return;
            if (Time.time < _lastDamageTime + _damageInterval) return;

            _lastDamageTime = Time.time;
            collision.collider.GetComponent<Health>()?.TakeDamage(_contactDamage);
            _animator?.PlayAttack(); // 공격 애니 (있으면)
        }

        private void HandleDeath()
        {
            Debug.Log("적 처치!");
            Destroy(gameObject);
        }
    }
}
