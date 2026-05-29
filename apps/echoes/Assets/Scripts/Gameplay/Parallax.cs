using UnityEngine;

namespace EchoesOfMaple.Gameplay
{
    /// <summary>
    /// 패럴랙스 배경 레이어. 카메라 이동량 × factor 만큼 따라가서 깊이감을 만든다.
    /// factor = 1 → 카메라에 거의 고정(가장 먼 하늘) / 0 → 안 따라감(전경처럼 빠르게 지나감).
    /// 각 배경 레이어 오브젝트에 부착하고, 먼 레이어일수록 factor를 1에 가깝게 설정.
    /// ⚠️ Unity에서 컴파일/플레이 검증 전 초안.
    /// </summary>
    public class Parallax : MonoBehaviour
    {
        [Range(0f, 1f)]
        [SerializeField] private float _factor = 0.5f; // 멀수록 1에 가깝게 (예: 하늘 0.9, 앞숲 0.3)

        private Transform _cam;
        private Vector3 _lastCam;

        private void Start()
        {
            _cam = Camera.main != null ? Camera.main.transform : null;
            if (_cam != null) _lastCam = _cam.position;
        }

        private void LateUpdate()
        {
            if (_cam == null) return;
            Vector3 delta = _cam.position - _lastCam;
            transform.position += new Vector3(delta.x * _factor, delta.y * _factor, 0f);
            _lastCam = _cam.position;
        }
    }
}
