using UnityEngine;

namespace EchoesOfMaple.Gameplay
{
    /// <summary>
    /// 포탈 — 플레이어가 트리거에 들어오면 target 위치로 순간이동 (맵/구역 이동).
    /// 같은 오브젝트에 Collider2D(Is Trigger 체크) 필요.
    /// target은 도착 지점을 표시하는 빈 GameObject의 Transform.
    /// ⚠️ Unity에서 컴파일/플레이 검증 전 초안.
    /// </summary>
    [RequireComponent(typeof(Collider2D))]
    public class Portal : MonoBehaviour
    {
        [SerializeField] private Transform _target; // 도착 위치 (빈 오브젝트)

        private void OnTriggerEnter2D(Collider2D other)
        {
            if (_target == null) return;
            if (other.GetComponent<PlayerController>() == null) return; // 플레이어만

            other.transform.position = _target.position;

            var rb = other.GetComponent<Rigidbody2D>();
            if (rb != null) rb.linearVelocity = Vector2.zero; // 이동 관성 제거
        }
    }
}
