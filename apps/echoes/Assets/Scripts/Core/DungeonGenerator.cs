using System;
using System.Collections.Generic;
using System.Text;

namespace EchoesOfMaple.Core
{
    /// <summary>
    /// 절차적 던전 생성. 의도적으로 UnityEngine 비의존(순수 C#) →
    /// 에디터 밖에서도 단위 테스트 가능 + 시드 고정 시 결정적(재현 가능).
    /// 참조: docs → implementation-plan (Phase 1 코어 루프)
    ///
    /// ⚠️ Unity에서 컴파일/실행 검증 전 초안. 밸런싱 상수는 Phase 3에서 조정.
    /// </summary>
    public class DungeonGenerator
    {
        // 방 유형별 등장 가중치
        private static readonly (RoomType Type, int Weight)[] RoomWeights =
        {
            (RoomType.Combat,   60),
            (RoomType.Elite,    12),
            (RoomType.Treasure, 15),
            (RoomType.Rest,     13),
        };

        // 난이도 곡선 상수 (Phase 3 AI 밸런싱 시뮬로 튜닝 예정)
        private const int BaseMonsterHp = 50;
        private const int HpPerFloor    = 18;
        private const int BaseRoomCount = 5;
        private const int RoomsPerFloor = 1;
        private const int MaxRooms      = 12;

        private readonly Random _rng;

        /// <param name="seed">지정 시 결정적 생성(테스트/디버그). 미지정 시 랜덤.</param>
        public DungeonGenerator(int? seed = null)
        {
            _rng = seed.HasValue ? new Random(seed.Value) : new Random();
        }

        /// <summary>층 1개 생성 → 선형 방 리스트</summary>
        public FloorLayout GenerateFloor(int floor)
        {
            int count = RoomCountForFloor(floor);
            var rooms = new List<RoomData>(count);
            for (int i = 1; i <= count; i++)
                rooms.Add(MakeRoom(i, i == count, floor));

            return new FloorLayout { Floor = floor, RoomCount = count, Rooms = rooms };
        }

        private RoomData MakeRoom(int index, bool isLast, int floor)
        {
            RoomType type;
            if (isLast)        type = RoomType.Rest;    // 층 마지막 = 휴식/다음 층 입구
            else if (index == 1) type = RoomType.Combat; // 첫 방 = 즉시 전투
            else               type = PickRoomType();

            var room = new RoomData { Index = index, Type = type };

            if (type == RoomType.Combat || type == RoomType.Elite)
            {
                int mult = type == RoomType.Elite ? 2 : 1;
                room.Monster = new MonsterStats
                {
                    Hp = MonsterHpForFloor(floor) * mult,
                    IsElite = type == RoomType.Elite,
                };
                room.EchoSeedCandidate = type == RoomType.Elite;
            }

            return room;
        }

        private RoomType PickRoomType()
        {
            int total = 0;
            foreach (var rw in RoomWeights) total += rw.Weight;

            int roll = _rng.Next(total);
            int acc = 0;
            foreach (var rw in RoomWeights)
            {
                acc += rw.Weight;
                if (roll < acc) return rw.Type;
            }
            return RoomWeights[0].Type; // fallback
        }

        private static int RoomCountForFloor(int floor)
            => Math.Min(BaseRoomCount + (floor - 1) * RoomsPerFloor, MaxRooms);

        private static int MonsterHpForFloor(int floor)
            => BaseMonsterHp + (floor - 1) * HpPerFloor;

        /// <summary>디버그용 층 구성 요약 (Unity 콘솔 점검)</summary>
        public static string Describe(FloorLayout layout)
        {
            var sb = new StringBuilder();
            sb.Append($"Floor {layout.Floor} ({layout.RoomCount} rooms): ");
            foreach (var r in layout.Rooms)
            {
                sb.Append(r.Type);
                if (r.EchoSeedCandidate) sb.Append('*');
                sb.Append(' ');
            }
            return sb.ToString();
        }
    }
}
