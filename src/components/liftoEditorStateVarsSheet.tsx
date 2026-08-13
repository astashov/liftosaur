import { JSX, useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "./primitives/text";
import { Button } from "./button";
import { LinkButton } from "./linkButton";
import { IconTrash } from "./icons/iconTrash";
import { InputNumber2 } from "./inputNumber2";
import { InputWeight2 } from "./inputWeight2";
import { useModal } from "../navigation/ModalStateContext";
import type { ILiftoEditorStateVarEntry } from "./primitives/liftoEditorActions";
import {
  ILiftoEditorStateVar,
  ILiftoEditorStateVarRow,
  ILiftoEditorStateVarValue,
  LiftoEditorStateVars_fromEntries,
  LiftoEditorStateVars_isUsed,
  LiftoEditorStateVars_print,
  LiftoEditorStateVars_remove,
  LiftoEditorStateVars_rows,
  LiftoEditorStateVars_set,
} from "./primitives/liftoEditorStateVars";
import { Dialog_alert } from "../utils/dialog";
import { Tailwind_colors, Tailwind_semantic } from "../utils/tailwindConfig";
import { Weight_buildAny, Weight_print } from "../models/weight";
import { IExerciseType, IProgramState, IProgramStateMetadata, ISettings } from "../types";

export interface ILiftoEditorStateVarsSheetProps {
  // What custom()'s parens hold now; on save, the same list rewritten.
  entries: ILiftoEditorStateVarEntry[];
  // The list holds something that isn't a `name: value` pair. Saving would drop it, so the
  // sheet shows what it could read and leaves the rewrite to the editor.
  hasUnparsed: boolean;
  // What the reused progress declares — the values this exercise inherits unless it
  // overrides them.
  defaults?: IProgramState;
  defaultsMetadata?: IProgramStateMetadata;
  sourceName?: string;
  // Every script that can reach this state: a variable either one mentions can't be deleted.
  progressScript?: string;
  updateScript?: string;
  exerciseType?: IExerciseType;
  settings: ISettings;
  onDone: (args: string) => void;
}

export function LiftoEditorStateVarsSheet(props: ILiftoEditorStateVarsSheetProps): JSX.Element {
  const [vars, setVars] = useState<ILiftoEditorStateVar[]>(() => LiftoEditorStateVars_fromEntries(props.entries));
  const rows = LiftoEditorStateVars_rows(vars, props.defaults, props.defaultsMetadata);
  const openCreate = useModal("createStateVarModal", (created) => {
    if (created != null) {
      setVars((current) =>
        LiftoEditorStateVars_set(current, created.name, {
          value: created.type === "number" ? 0 : Weight_buildAny(0, created.type),
          userPrompted: created.isUserPrompted,
        })
      );
    }
  });

  const setValue = (row: ILiftoEditorStateVarRow, value: ILiftoEditorStateVarValue): void => {
    setVars((current) => LiftoEditorStateVars_set(current, row.name, { value, userPrompted: row.userPrompted }));
  };

  return (
    <View>
      <Text className="text-xs text-text-secondary">
        Values the progress script remembers between workouts. Read and changed via{" "}
        <Text className="text-xs font-bold">state.name</Text> in the script.
      </Text>
      {props.sourceName != null && (
        <Text className="pt-2 text-xs text-text-secondary">
          Progress is reused from <Text className="text-xs font-bold">{props.sourceName}</Text>. Changing a value here
          overrides it for this exercise only.
        </Text>
      )}
      {props.hasUnparsed && (
        <Text className="pt-2 text-xs text-text-error">
          There's something in this progress' arguments that isn't a state variable, so saving from here would drop it.
          Fix the line in the editor first.
        </Text>
      )}
      <View className="mt-3 border rounded-lg bg-background-cardpurple border-border-cardpurple">
        {rows.length === 0 && (
          <View className="p-3">
            <Text className="text-xs text-text-secondary">This progress has no state variables yet.</Text>
          </View>
        )}
        {rows.map((row) => (
          <StateVarRow
            key={row.name}
            row={row}
            settings={props.settings}
            exerciseType={props.exerciseType}
            isUsedInScript={LiftoEditorStateVars_isUsed(row.name, props)}
            onChange={(value) => setValue(row, value)}
            onReset={() => setVars((current) => LiftoEditorStateVars_remove(current, row.name))}
            onDelete={() => setVars((current) => LiftoEditorStateVars_remove(current, row.name))}
          />
        ))}
        {!props.hasUnparsed && (
          <View className="p-2">
            <Button
              kind="lightpurple"
              name="add-state-variable"
              className="w-full text-sm"
              onClick={() => openCreate({ existingNames: rows.map((r) => r.name) })}
            >
              + Add State Variable
            </Button>
          </View>
        )}
      </View>
      <View className="items-center pt-4">
        <Button
          kind="purple"
          name="state-vars-save"
          disabled={props.hasUnparsed}
          onClick={() => props.onDone(LiftoEditorStateVars_print(vars))}
        >
          Save
        </Button>
      </View>
    </View>
  );
}

interface IStateVarRowProps {
  row: ILiftoEditorStateVarRow;
  settings: ISettings;
  exerciseType?: IExerciseType;
  isUsedInScript: boolean;
  onChange: (value: ILiftoEditorStateVarValue) => void;
  onReset: () => void;
  onDelete: () => void;
}

function StateVarRow(props: IStateVarRowProps): JSX.Element {
  const { row } = props;
  const isInherited = row.defaultValue != null;
  const isOverridden = isInherited && row.isDeclared;
  return (
    <View className="p-2 border-b border-border-cardpurple" testID={`state-var-${row.name}`}>
      <View className="flex-row items-center gap-4">
        <View className="flex-1">
          {/* No leading-none: a line box the size of the font clips Poppins' ascenders. */}
          <Text>{row.name}</Text>
          {row.userPrompted && <Text className="text-xs text-text-secondary">User prompted</Text>}
          {isInherited && !isOverridden && <Text className="text-xs text-text-secondary">Reused</Text>}
          {isOverridden && row.defaultValue != null && (
            <Text className="text-xs text-text-secondary">Overrides {Weight_print(row.defaultValue)}</Text>
          )}
        </View>
        <View>
          {/* Live, not the default debounce: Save serializes the values straight out of
              state, so a keypad tap followed by an immediate Save would write the old one. */}
          {typeof row.value === "number" ? (
            <InputNumber2
              name={row.name}
              value={row.value}
              step={1}
              allowDot={true}
              inputCommitMode="live"
              onInput={(value) => {
                if (value != null) {
                  props.onChange(value);
                }
              }}
            />
          ) : (
            <InputWeight2
              name={row.name}
              value={row.value}
              showUnitInside={true}
              settings={props.settings}
              units={["lb", "kg", "%"]}
              exerciseType={props.exerciseType}
              inputCommitMode="live"
              onInput={(value) => {
                if (value != null) {
                  props.onChange(value);
                }
              }}
            />
          )}
        </View>
        {/* Fixed width so the value inputs line up down the column whatever each row's
            action is — and wide enough for "Reset" to stay on one line as the rem grows. */}
        <View className="items-end" style={{ width: 48 }}>
          {isOverridden ? (
            <LinkButton className="text-xs" name={`state-var-reset-${row.name}`} onClick={props.onReset}>
              Reset
            </LinkButton>
          ) : isInherited ? null : (
            <Pressable
              className="py-1 pl-1 pr-2"
              testID={`state-var-delete-${row.name}`}
              onPress={() => {
                if (props.isUsedInScript) {
                  Dialog_alert("You cannot delete it, because this state variable is used in the script.");
                } else {
                  props.onDelete();
                }
              }}
            >
              <IconTrash
                color={props.isUsedInScript ? Tailwind_colors().lightgray[300] : Tailwind_semantic().icon.neutral}
                width={14}
                height={18}
              />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}
