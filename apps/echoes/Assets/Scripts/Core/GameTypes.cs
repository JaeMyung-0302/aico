namespace EchoesOfMaple.Core
{
    // 방 유형 — 절차적 던전 구성 단위
    public enum RoomType
    {
        Combat,   // 일반 전투
        Elite,    // 정예 (강함 → async-social 페이즈에서 잔흔 미니보스 시드 후보)
        Treasure, // 보상
        Rest,     // 회복/메타, 층 마지막
    }

    // 몬스터 스탯 (층 비례 스케일)
    public struct MonsterStats
    {
        public int Hp;
        public bool IsElite;
    }

    // 방 1개
    public class RoomData
    {
        public int Index;
        public RoomType Type;
        public MonsterStats? Monster;      // 비전투 방은 null
        public bool EchoSeedCandidate;     // elite 방 → 잔흔 미니보스 시드 후보 (후속 페이즈)
    }

    // 층 1개 = 선형 방 리스트 (분기는 v1.1)
    public class FloorLayout
    {
        public int Floor;
        public int RoomCount;
        public System.Collections.Generic.List<RoomData> Rooms;
    }
}
