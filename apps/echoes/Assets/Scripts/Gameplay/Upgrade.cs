using System;

namespace EchoesOfMaple.Gameplay
{
    /// <summary>업그레이드 정의 — 이름·설명·적용 동작.</summary>
    public class Upgrade
    {
        public string Name;
        public string Description;
        public Action Apply;

        public Upgrade(string name, string description, Action apply)
        {
            Name = name;
            Description = description;
            Apply = apply;
        }
    }
}
