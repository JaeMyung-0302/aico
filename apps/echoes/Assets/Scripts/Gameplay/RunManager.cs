using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using EchoesOfMaple.Core;

namespace EchoesOfMaple.Gameplay
{
    /// <summary>
    /// 한 판(run) 진행자. DungeonGenerator로 층을 만들고 방을 순서대로 진행.
    /// 전투 방 = 적 wave 스폰 → 전멸 시 다음 방. 보물/휴식 = 회복/대기.
    /// 플레이어 사망 시 잠시 후 자동 재시작(층 1부터, 체력 복구, 시작 위치 복귀).
    ///
    /// 셋업: 빈 RunManager 오브젝트에 부착 + Enemy Prefab 할당.
    /// ⚠️ Unity에서 컴파일/플레이 검증 전 초안.
    /// </summary>
    public class RunManager : MonoBehaviour
    {
        [Header("스폰")]
        [SerializeField] private GameObject _enemyPrefab;
        [SerializeField] private float _spawnXRange = 6f;       // 스폰 분산 범위
        [SerializeField] private float _spawnMinDistance = 3f;  // 플레이어로부터 최소 거리(즉사 방지)
        [SerializeField] private float _spawnY = 0f;            // 스폰 높이(바닥 위)

        [Header("재시작")]
        [SerializeField] private float _restartDelay = 2f;

        [Header("디버그")]
        [SerializeField] private int _startSeed = 0;            // 0이면 랜덤

        private DungeonGenerator _generator;
        private Transform _player;
        private Rigidbody2D _playerRb;
        private Health _playerHealth;
        private Vector3 _playerStartPos;
        private readonly List<GameObject> _spawned = new List<GameObject>();

        public int Floor { get; private set; }

        private void Start()
        {
            if (_enemyPrefab == null)
            {
                Debug.LogError("RunManager: Enemy Prefab이 비어있습니다. Inspector에서 할당하세요.");
                return;
            }

            var pc = FindAnyObjectByType<PlayerController>();
            if (pc != null)
            {
                _player = pc.transform;
                _playerRb = pc.GetComponent<Rigidbody2D>();
                _playerHealth = pc.GetComponent<Health>();
                _playerStartPos = _player.position;
            }

            StartCoroutine(GameLoop());
        }

        // 한 판 → (사망 시) 재시작 → 반복
        private IEnumerator GameLoop()
        {
            while (true)
            {
                yield return RunRoutine();   // 플레이어 사망 시 RunRoutine 종료
                Debug.Log($"=== {_restartDelay}초 후 재시작 ===");
                yield return new WaitForSeconds(_restartDelay);
                ResetForNewRun();
            }
        }

        private IEnumerator RunRoutine()
        {
            _generator = _startSeed != 0 ? new DungeonGenerator(_startSeed) : new DungeonGenerator();
            Floor = 0;

            while (true) // 층 무한 진행 (사망 시 중단)
            {
                Floor++;
                var layout = _generator.GenerateFloor(Floor);
                Debug.Log($"=== Floor {Floor} 시작 ({layout.RoomCount} rooms) ===");

                foreach (var room in layout.Rooms)
                {
                    if (IsPlayerDead()) { Debug.Log("=== 게임 오버 ==="); yield break; }
                    yield return EnterRoom(room);
                }

                Debug.Log($"=== Floor {Floor} 클리어! ===");
            }
        }

        // 사망 후 새 판 준비: 적 정리 + 플레이어 부활/위치 복귀
        private void ResetForNewRun()
        {
            ClearEnemies();
            if (_playerHealth != null) _playerHealth.Revive();
            if (_player != null) _player.position = _playerStartPos;
            if (_playerRb != null) _playerRb.linearVelocity = Vector2.zero;
            Debug.Log("=== 새 판 시작 ===");
        }

        private IEnumerator EnterRoom(RoomData room)
        {
            switch (room.Type)
            {
                case RoomType.Combat:
                case RoomType.Elite:
                {
                    int count = room.Type == RoomType.Elite ? 3 : 2;
                    SpawnWave(count, room);

                    // 적 전멸까지 대기
                    while (AliveEnemies() > 0)
                    {
                        if (IsPlayerDead()) yield break;
                        yield return null;
                    }
                    Debug.Log($"방 {room.Index} ({room.Type}) 클리어");
                    break;
                }
                case RoomType.Treasure:
                    Debug.Log($"방 {room.Index}: 보물 — 체력 +10");
                    _playerHealth?.Heal(10);
                    yield return new WaitForSeconds(1f);
                    break;

                case RoomType.Rest:
                    Debug.Log($"방 {room.Index}: 휴식");
                    yield return new WaitForSeconds(1f);
                    break;
            }
        }

        private void SpawnWave(int count, RoomData room)
        {
            _spawned.Clear();
            float playerX = _player != null ? _player.position.x : 0f;

            for (int i = 0; i < count; i++)
            {
                // 플레이어 양옆 최소거리 밖에서 스폰(즉시 협공사 방지) + 바닥 범위로 제한
                float side = Random.value < 0.5f ? -1f : 1f;
                float dist = Random.Range(_spawnMinDistance, _spawnMinDistance + _spawnXRange);
                float x = Mathf.Clamp(playerX + side * dist, -9f, 9f);
                _spawned.Add(Instantiate(_enemyPrefab, new Vector3(x, _spawnY, 0f), Quaternion.identity));
            }
            Debug.Log($"방 {room.Index}: 적 {count}체 스폰");
        }

        private void ClearEnemies()
        {
            foreach (var e in _spawned)
                if (e != null) Destroy(e);
            _spawned.Clear();
        }

        // 파괴된 GameObject는 Unity에서 null로 취급 → 살아있는 적 수 계산
        private int AliveEnemies()
        {
            int alive = 0;
            foreach (var e in _spawned)
                if (e != null) alive++;
            return alive;
        }

        private bool IsPlayerDead()
            => _playerHealth != null && _playerHealth.IsDead;
    }
}
