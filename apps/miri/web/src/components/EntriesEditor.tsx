import { useId, useState, type FormEvent } from "react";
import { parseCustom, type Choice, type EntriesStepDef, type Entry, type EntryField } from "../domain.ts";
import styles from "./EntriesEditor.module.scss";
import Stepper from "./Stepper.tsx";

type ChoiceField = Extract<EntryField, { kind: "choice" }>;
type NumberField = Extract<EntryField, { kind: "number" }>;

type Props = {
  step: EntriesStepDef;
  entries: Entry[];
  /** 고를 수 있는 첫 칸 선택지. 앞 단계 답으로 이미 좁혀져 있다. */
  choices: readonly Choice[];
  onAdd: (value: string) => void;
  onChange: (index: number, key: string, value: number) => void;
  onRemove: (index: number) => void;
  /** 직접 추가를 받을 묶음(고른 부위). 비어 있으면 직접 추가를 숨긴다. */
  groups?: readonly Choice[];
  /** 규칙에 맞게 더했으면 true. false 면 입력을 그대로 둔다. */
  onAddCustom?: (group: string, name: string) => boolean;
  disabled?: boolean;
};

/**
 * 카탈로그에 없는 종목을 이름으로 한 번 더한다. 키보드를 쓰는 유일한 자리라
 * 칩을 눌러야 열리고, 더하면 닫힌다. 부위가 여럿이면 어느 부위인지 먼저 고른다.
 */
function CustomForm({
  groups,
  maxLength,
  onSubmit,
  onClose,
  disabled,
}: {
  groups: readonly Choice[];
  maxLength: number;
  onSubmit: (group: string, name: string) => boolean;
  onClose: () => void;
  disabled: boolean;
}) {
  const inputId = useId();
  const [group, setGroup] = useState(groups[0]?.value ?? "");
  const [name, setName] = useState("");
  const [invalid, setInvalid] = useState(false);
  const groupLabel = groups.find((item) => item.value === group)?.label ?? "";

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (onSubmit(group, name)) return;
    setInvalid(true);
  };

  return (
    <form className={styles.custom} onSubmit={handleSubmit}>
      {groups.length > 1 ? (
        <div className={styles.groups} role="radiogroup" aria-label="부위">
          {groups.map((item) => (
            <button
              key={item.value}
              type="button"
              role="radio"
              aria-checked={item.value === group}
              className={`${styles.group} ${item.value === group ? styles.groupOn : ""}`}
              onClick={() => setGroup(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
      <label htmlFor={inputId} className={styles.customLabel}>
        {groupLabel} 종목 이름
      </label>
      <div className={styles.customRow}>
        <input
          id={inputId}
          className={styles.input}
          value={name}
          maxLength={maxLength}
          autoFocus
          enterKeyHint="done"
          autoComplete="off"
          aria-invalid={invalid || undefined}
          disabled={disabled}
          onChange={(event) => {
            setName(event.target.value);
            setInvalid(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") onClose();
          }}
        />
        <button type="submit" className={styles.submit} disabled={disabled || name.trim().length === 0}>
          더하기
        </button>
      </div>
      <span className={styles.customHint}>
        {invalid ? `1~${maxLength}자로 적어주세요` : "한 번 더하면 다음부터 칩으로 나와요"}
      </span>
    </form>
  );
}

/**
 * 묶음 단계 입력. 첫 칸(종목 같은 선택지)을 칩으로 골라 줄을 더하고,
 * 줄마다 나머지 수 칸을 +/- 로 맞춘다. 타이핑은 없다.
 */
export default function EntriesEditor({
  step,
  entries,
  choices,
  onAdd,
  onChange,
  onRemove,
  groups = [],
  onAddCustom,
  disabled = false,
}: Props) {
  const [writing, setWriting] = useState(false);
  const head = step.fields.find(
    (field): field is ChoiceField => field.kind === "choice",
  );
  const numbers = step.fields.filter(
    (field): field is NumberField => field.kind === "number",
  );
  if (!head) return null;

  const added = new Set(entries.map((entry) => String(entry[head.key])));
  const addable = choices.filter((choice) => !added.has(choice.value));
  const full = entries.length >= step.maxEntries;
  const labelOf = (value: string) =>
    head.choices.find((choice) => choice.value === value)?.label ?? parseCustom(value)?.name ?? value;
  const canCustom = Boolean(head.custom && onAddCustom && groups.length > 0) && !full;

  return (
    <div className={styles.editor}>
      {entries.length > 0 ? (
        <ol className={styles.rows} aria-label="고른 것">
          {entries.map((entry, index) => {
            const name = labelOf(String(entry[head.key]));
            return (
              <li key={`${String(entry[head.key])}-${index}`} className={styles.row}>
                <div className={styles.rowHead}>
                  <span className={styles.rowName}>{name}</span>
                  <button
                    type="button"
                    className={styles.remove}
                    aria-label={`${name} 빼기`}
                    disabled={disabled}
                    onClick={() => onRemove(index)}
                  >
                    빼기
                  </button>
                </div>
                <div className={styles.numbers}>
                  {numbers.map((field) => (
                    <Stepper
                      key={field.key}
                      compact
                      label={field.label}
                      range={field}
                      value={Number(entry[field.key] ?? field.initial ?? field.min)}
                      disabled={disabled}
                      onChange={(value) => onChange(index, field.key, value)}
                    />
                  ))}
                </div>
              </li>
            );
          })}
        </ol>
      ) : null}

      {writing && canCustom && head.custom && onAddCustom ? (
        <CustomForm
          groups={groups}
          maxLength={head.custom.maxLength}
          disabled={disabled}
          onClose={() => setWriting(false)}
          onSubmit={(group, name) => {
            const added = onAddCustom(group, name);
            if (added) setWriting(false);
            return added;
          }}
        />
      ) : null}

      {!full && (addable.length > 0 || canCustom) ? (
        <div className={styles.picker} role="group" aria-label={`${head.label} 더하기`}>
          {addable.map((choice) => (
            <button
              key={choice.value}
              type="button"
              className={styles.chip}
              disabled={disabled}
              onClick={() => onAdd(choice.value)}
            >
              + {choice.label}
            </button>
          ))}
          {canCustom && !writing ? (
            <button
              type="button"
              className={`${styles.chip} ${styles.chipCustom}`}
              disabled={disabled}
              onClick={() => setWriting(true)}
            >
              직접 추가
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
