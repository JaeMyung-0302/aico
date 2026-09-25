import type { ReactNode } from "react";
import Button from "../components/Button.tsx";
import Canvas from "../components/Canvas.tsx";
import ChoiceGrid from "../components/ChoiceGrid.tsx";
import { LoggerHeader, Wordmark } from "../components/Header.tsx";
import Orb from "../components/Orb.tsx";
import {
  Confirm,
  EntryChips,
  ErrorNote,
  Question,
  Trace,
} from "../components/Prompt.tsx";
import StepStage from "../components/StepStage.tsx";
import { KIND_LABEL, PART_LABEL, type Kind } from "../domain.ts";
import {
  describeSlot,
  intensityChoices,
  KIND_CHOICES,
  PART_CHOICES,
} from "./options.ts";
import { useLoggerFlow, type Step } from "./useLoggerFlow.ts";

type Flow = ReturnType<typeof useLoggerFlow>;
type PickStep = Extract<Step, "kind" | "part" | "intensity">;

const QUESTIONS: Record<PickStep, string> = {
  kind: "오늘 몸 어떻게 썼어요?",
  part: "어디 했어요?",
  intensity: "어땠어요?",
};

/** 헬스는 3단계, 유산소는 2단계. 그 외는 진행점을 보이지 않는다. */
function progressOf(kind: Kind | null, step: PickStep) {
  if (kind === "gym") return { current: { kind: 0, part: 1, intensity: 2 }[step], total: 3 };
  if (kind === "cardio") return { current: step === "kind" ? 0 : 1, total: 2 };
  return null;
}

function ConfirmScreen({ flow, nav }: { flow: Flow; nav: ReactNode }) {
  if (!flow.prediction) return null;
  return (
    <Canvas
      header={<LoggerHeader progress={null} mood="asking" />}
      nav={nav}
      dock={
        <>
          {flow.error ? <ErrorNote>{flow.error}</ErrorNote> : null}
          <Button onClick={flow.handleAcceptClick}>그래요</Button>
          <Button variant="ghost" onClick={flow.handleDeclineClick}>
            다르게 골라요
          </Button>
        </>
      }
    >
      <StepStage stepKey="confirm">
        <Trace items={["지난 같은 요일처럼"]} />
        <Question>오늘도 이렇게?</Question>
        <EntryChips entry={flow.prediction} />
      </StepStage>
    </Canvas>
  );
}

function DoneScreen({ flow, nav }: { flow: Flow; nav: ReactNode }) {
  const next = flow.settings ? describeSlot(flow.settings.notifyAt) : null;
  const sub = flow.settings?.paused
    ? "알림은 잠시 멈춰 있어요"
    : next
      ? `내일 ${next}에 다시 물어볼게요`
      : "내일 다시 물어볼게요";

  return (
    <Canvas
      lit
      header={<Wordmark />}
      nav={nav}
      dock={
        <Button variant="ghost" onClick={flow.handleAgainClick}>
          다시 고르기
        </Button>
      }
    >
      <Orb size="lg" mood="done" />
      <Confirm title="기록했어요" sub={sub} />
      {flow.saved ? <EntryChips entry={flow.saved} /> : null}
    </Canvas>
  );
}

/** 질문 영역. 고른 경로(trace)와 현재 질문이 같은 무대 위에서 교체된다. */
function QuestionStage({ step, flow }: { step: PickStep; flow: Flow }) {
  const trace = [
    flow.kind ? KIND_LABEL[flow.kind] : null,
    step === "intensity" && flow.parts.length > 0
      ? flow.parts.map((part) => PART_LABEL[part]).join(" ")
      : null,
  ].filter((label): label is string => Boolean(label));

  return (
    <StepStage stepKey={step}>
      <Trace items={trace} />
      <div aria-live="polite">
        <Question>{QUESTIONS[step]}</Question>
      </div>
    </StepStage>
  );
}

/** 하단 도크. 에러 한 줄 + 단계별 선택지. 부위는 여러 개 고르고 "다음". */
function ChoiceDock({ step, flow }: { step: PickStep; flow: Flow }) {
  return (
    <>
      {flow.error ? <ErrorNote>{flow.error}</ErrorNote> : null}
      <StepStage stepKey={`${step}-choices`}>
        {step === "kind" ? (
          <ChoiceGrid
            label="운동 종류"
            choices={KIND_CHOICES}
            columns={2}
            onPick={flow.handleKindClick}
          />
        ) : null}
        {step === "part" ? (
          <>
            <ChoiceGrid
              label="운동 부위"
              choices={PART_CHOICES}
              columns={2}
              selected={flow.parts}
              onPick={flow.handlePartToggle}
            />
            <Button
              onClick={flow.handlePartsNextClick}
              disabled={flow.parts.length === 0}
            >
              {flow.parts.length === 0 ? "부위를 골라주세요" : "다음"}
            </Button>
          </>
        ) : null}
        {step === "intensity" && flow.kind ? (
          <ChoiceGrid
            label="강도"
            choices={intensityChoices(flow.kind)}
            columns={3}
            onPick={flow.handleIntensityClick}
          />
        ) : null}
      </StepStage>
    </>
  );
}

export default function Logger({
  userId,
  onExpired,
  nav,
}: {
  userId: string;
  onExpired: () => void;
  nav: ReactNode;
}) {
  const flow = useLoggerFlow({ userId, onExpired });
  const { step, kind } = flow;

  if (step === "loading") {
    return <Canvas header={<LoggerHeader progress={null} />} nav={nav} />;
  }
  if (step === "confirm") return <ConfirmScreen flow={flow} nav={nav} />;
  if (step === "done") return <DoneScreen flow={flow} nav={nav} />;

  return (
    <Canvas
      header={<LoggerHeader progress={progressOf(kind, step)} />}
      nav={nav}
      dock={<ChoiceDock step={step} flow={flow} />}
    >
      <QuestionStage step={step} flow={flow} />
    </Canvas>
  );
}
