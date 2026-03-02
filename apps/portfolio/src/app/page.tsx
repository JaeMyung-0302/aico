import Hero from "@/components/hero";
import ProjectGrid from "@/components/project-grid";
import SkillSection from "@/components/skill-section";
import Footer from "@/components/footer";
import ChatPanel from "@/components/chat/chat-panel";

const Home = () => {
  return (
    <>
      <main>
        <Hero />
        <ProjectGrid />
        <SkillSection />
      </main>
      <Footer />
      <ChatPanel />
    </>
  );
};

export default Home;
