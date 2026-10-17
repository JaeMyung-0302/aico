import { useId, useState, type FormEvent } from "react";
import { parseCustom, type Choice, type EntriesStepDef, type Entry, type EntryField } from "../domain.ts";
import styles from "./EntriesEditor.module.scss";
import NumberInput from "./NumberInput.tsx";

type ChoiceField = Extract<EntryField, { kind: "choice" }>;
type NumberField = Extract<EntryField, { kind: "number" }>;

type Props = {
  step: EntriesStepDef;
  entries: Entry[];
  /** 고를 수 있는 첫 칸 선택지. 앞 단계 답으로 이미 좁혀져 있다. */
  choices: readonly Choice[];
  onAdd: (value: string) => void;
  /** 이 첫 칸 아래에 한 줄 더. 앞 줄을 바탕으로 채운다. */
  onAddRow: (value: string) => void;
  onChange: (index: number, key: string, value: number) => void;
  onRemove: (index: number) => void;
  /** 이 첫 칸의 줄을 전부 뺀다. */
  onRemoveAll: (value: string) => void;
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
 * 묶음 단계 입력. 첫 칸(종목 같은 선택지)을 칩으로 골라 카드를 만들고,
 * 카드 안에 줄(세트)을 쌓는다. 수는 탭하면 키패드로 바로 적는다.
 * 줄을 더하면 앞 줄을 바탕으로 채워 두어, 대부분은 한 칸만 고치면 된다.
 */
export default function EntriesEditor({
  step,
  entries,
  choices,
  onAdd,
  onAddRow,
  onChange,
  onRemove,
  onRemoveAll,
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

  // 같은 첫 칸의 줄을 처음 나온 순서대로 한 카드에 모은다. index 는 전체 목록에서의 자리.
  const cards = new Map<string, { index: number; entry: Entry }[]>();
  entries.forEach((entry, index) => {
    const value = String(entry[head.key]);
    cards.set(value, [...(cards.get(value) ?? []), { index, entry }]);
  });
  const addable = choices.filter((choice) => !cards.has(choice.value));
  const full = entries.length >= step.maxEntries;
  const rowLabel = step.rowLabel ?? "줄";
  const labelOf = (value: string) =>
    head.choices.find((choice) => choice.value === value)?.label ?? parseCustom(value)?.name ?? value;
  const canCustom = Boolean(head.custom && onAddCustom && groups.length > 0) && !full;

  return (
    <div className={styles.editor}>
      {cards.size > 0 ? (
        <ol className={styles.cards} aria-label="고른 것">
          {[...cards.entries()].map(([value, rows]) => {
            const name = labelOf(value);
            return (
              <li key={value} className={styles.card}>
                <div className={styles.cardHead}>
                  <span className={styles.cardName}>{name}</span>
                  <button
                    type="button"
                    className={styles.remove}
                    aria-label={`${name} 빼기`}
                    disabled={disabled}
                    onClick={() => onRemoveAll(value)}
                  >
                    빼기
                  </button>
                </div>
                <ol className={styles.rows}>
                  {rows.map(({ index, entry }, order) => (
                    <li key={index} className={styles.row}>
                      <span className={styles.order} aria-hidden="true">
                        {order + 1}
                      </span>
                      {numbers.map((field) => (
                        <NumberInput
                          key={field.key}
                          label={`${order + 1}${rowLabel} ${field.label}`}
                          shownLabel={order === 0 ? field.label : null}
                          range={field}
                          value={Number(entry[field.key] ?? field.initial ?? field.min)}
                          disabled={disabled}
                          onChange={(next) => onChange(index, field.key, next)}
                        />
                      ))}
                      {rows.length > 1 ? (
                        <button
                          type="button"
                          className={styles.removeRow}
                          aria-label={`${name} ${order + 1}${rowLabel} 빼기`}
                          disabled={disabled}
                          onClick={() => onRemove(index)}
                        >
                          ×
                        </button>
                      ) : (
                        <span className={styles.removeRow} aria-hidden="true" />
                      )}
                    </li>
                  ))}
                </ol>
                <button
                  type="button"
                  className={styles.addRow}
                  disabled={disabled || full}
                  onClick={() => onAddRow(value)}
                >
                  + {rowLabel}
                </button>
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
