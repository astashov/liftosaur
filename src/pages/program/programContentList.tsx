import { h, JSX, Fragment } from "preact";
import { IStorage } from "../../types";
import { IAccount } from "../../models/account";
import { IconDuplicate2 } from "../../components/icons/iconDuplicate2";
import { IconTrash } from "../../components/icons/iconTrash";
import { IEnv, IState, buildState, updateState } from "../../models/state";
import { Storage } from "../../models/storage";
import { Thunk } from "../../ducks/thunks";
import { useThunkReducer } from "../../utils/useThunkReducer";
import { reducerWrapper } from "../../ducks/reducer";
import { lb } from "lens-shmens";
import { UidFactory } from "../../utils/generator";
import { EditProgram } from "../../models/editProgram";
import { ExerciseImageUtils } from "../../models/exerciseImage";
import { ExerciseImage } from "../../components/exerciseImage";
import { StringUtils } from "../../utils/string";
import { Button } from "../../components/button";
import { useState } from "preact/hooks";
import { ModalCreateProgram } from "../../components/modalCreateProgram";
import { IconSpinner } from "../../components/icons/iconSpinner";
import { CollectionUtils } from "../../utils/collection";
import { Exercise } from "../../models/exercise";

export interface IProgramContentListProps {
  env: IEnv;
  storage: IStorage;
  account: IAccount;
  isMobile: boolean;
}

export function ProgramContentList(props: IProgramContentListProps): JSX.Element {
  const { storage } = props;

  const [showCreateProgramModal, setShowCreateProgramModal] = useState(false);
  const [creatingPrograms, setCreatingPrograms] = useState<Set<string>>(new Set());

  const initialState = buildState({ storage, userId: props.account.id });
  const [state, dispatch] = useThunkReducer(reducerWrapper(false), initialState, props.env, [
    (aDispatch, action, oldState, newState) => {
      if (Storage.isChanged(oldState.storage, newState.storage)) {
        aDispatch(
          Thunk.sync({ withHistory: false, withStats: false, withPrograms: true }, (newStorage) => {
            const newCreatingPrograms = new Set(creatingPrograms);
            for (const program of newStorage.programs) {
              newCreatingPrograms.delete(program.name);
            }
            setCreatingPrograms(newCreatingPrograms);
          })
        );
      }
    },
  ]);

  return (
    <div className="mx-4">
      <div className="flex flex-col mb-8 sm:items-center sm:flex-row">
        <h1 className="flex-1 mb-4 text-2xl font-bold sm:mb-0">Your Programs</h1>
        <div className="sm:ml-4">
          <Button
            name="add-account-program"
            className="inline-block leading-4"
            kind="orange"
            onClick={() => {
              setShowCreateProgramModal(true);
            }}
          >
            New Program in Your Account
          </Button>
          <a
            href="/program"
            className="inline-block px-8 py-2 mt-2 text-xs font-semibold leading-6 text-white bg-purple-700 sm:mt-0 sm:ml-4 rounded-2xl nm-add-standalone-program"
            target="_blank"
          >
            New Standalone Program
          </a>
        </div>
      </div>
      <ul>
        {CollectionUtils.sortByExpr(state.storage.programs, (p) => p.clonedAt || 0, true).map((program) => {
          const isCreating = creatingPrograms.has(program.name);
          return (
            <li className="mb-8">
              <div>
                <a
                  className={`text-lg font-bold ${isCreating ? "text-grayv2-main" : "text-bluev2 underline"}`}
                  target="_blank"
                  href={`/user/p/${encodeURIComponent(program.id)}`}
                  onClick={(event) => {
                    if (isCreating) {
                      event.preventDefault();
                    }
                  }}
                >
                  {isCreating ? <IconSpinner width={18} height={18} /> : <></>} {program.name}
                </a>
                <span className="ml-4">
                  <button
                    className="px-2 align-middle ls-programs-list-copy-program button"
                    onClick={() => {
                      const newName = `${program.name} Copy`;
                      updateState(dispatch, [
                        lb<IState>()
                          .p("storage")
                          .p("programs")
                          .recordModify((programs) => {
                            const newPrograms = [...programs];
                            newPrograms.push({
                              ...program,
                              name: newName,
                              id: UidFactory.generateUid(8),
                              clonedAt: Date.now(),
                            });
                            return newPrograms;
                          }),
                      ]);
                    }}
                  >
                    <IconDuplicate2 />
                  </button>
                  <button
                    className="px-2 align-middle ls-programs-list-delete-program button"
                    onClick={() => {
                      if (state.storage.programs.length < 2) {
                        alert("You cannot delete all your programs, you should have at least one");
                      } else {
                        const confirmText =
                          state.storage.currentProgramId === program.id
                            ? "Are you sure? This will delete your current program!"
                            : "Are you sure?";
                        if (confirm(confirmText)) {
                          EditProgram.deleteProgram(dispatch, program, state.storage.programs);
                        }
                      }
                    }}
                  >
                    <IconTrash />
                  </button>
                </span>
              </div>
              <div className="pt-2">
                {CollectionUtils.uniqByExpr(program.exercises, (e) => Exercise.toKey(e.exerciseType))
                  .filter((e) => ExerciseImageUtils.exists(e.exerciseType, "small", state.storage.settings))
                  .map((e) => (
                    <ExerciseImage
                      settings={state.storage.settings}
                      exerciseType={e.exerciseType}
                      size="small"
                      className="w-6 mr-1"
                    />
                  ))}
              </div>
              <div className="pt-1 text-grayv2-main">
                {program.isMultiweek
                  ? `${program.weeks.length} ${StringUtils.pluralize("week", program.weeks.length)}, `
                  : ""}
                {program.days.length} {StringUtils.pluralize("day", program.days.length)}, {program.exercises.length}{" "}
                {StringUtils.pluralize("exercise", program.exercises.length)}
              </div>
            </li>
          );
        })}
      </ul>
      {showCreateProgramModal && (
        <ModalCreateProgram
          isHidden={!showCreateProgramModal}
          onClose={() => setShowCreateProgramModal(false)}
          onSelect={(name) => {
            setShowCreateProgramModal(false);
            setCreatingPrograms((prev) => new Set([...prev, name]));
            dispatch({ type: "CreateProgramAction", name });
          }}
        />
      )}
    </div>
  );
}
