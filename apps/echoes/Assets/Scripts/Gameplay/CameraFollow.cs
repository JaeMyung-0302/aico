using UnityEngine;

namespace EchoesOfMaple.Gameplay
{
    /// <summary>
    /// 카메라가 대상(기본: 플레이어)을 부드럽게 따라감. Main Camera에 부착.
    /// Target 미지정 시 PlayerController를 자동 탐색. 2D 카메라의 z는 유지(-10).
    /// ⚠️ Unity에서 컴파일/플레이 검증 전 초안.
    /// </summary>
    public class CameraFollow : MonoBehaviour
    {
        [SerializeField] private Transform _target;
        [SerializeField] private float _smoothTime = 0.15f;   // 작을수록 빠르게 따라감
        [SerializeField] private Vector2 _offset = new Vector2(0f, 1f);

        private Vector3 _velocity;

        private void Awake()
        {
            if (_target == null)
            {
                var pc = FindAnyObjectByType<PlayerController>();
                if (pc != null) _target = pc.transform;
            }
        }

        private void LateUpdate()
        {
            if (_target == null) return;

            Vector3 desired = new Vector3(
                _target.position.x + _offset.x,
                _target.position.y + _offset.y,
                transform.position.z); // 카메라 z(보통 -10) 유지

            transform.position = Vector3.SmoothDamp(transform.position, desired, ref _velocity, _smoothTime);
        }
    }
}
