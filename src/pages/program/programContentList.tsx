import { h, JSX } from "preact";
import { IStorage, IProgram } from "../../types";
import { IAccount } from "../../models/account";
import { IconDuplicate2 } from "../../components/icons/iconDuplicate2";
import { IconTrash } from "../../components/icons/iconTrash";
import { IEnv, buildState, updateState, IState } from "../../models/state";
import { useThunkReducer } from "../../utils/useThunkReducer";
import { reducerWrapper } from "../../ducks/reducer";
import { UidFactory } from "../../utils/generator";
import { Service } from "../../api/service";
import { ExerciseImageUtils } from "../../models/exerciseImage";
import { ExerciseImage } from "../../components/exerciseImage";
import { StringUtils } from "../../utils/string";
import { Button } from "../../components/button";
import { useState } from "preact/hooks";
import { ModalCreateProgram } from "../../components/modalCreateProgram";
import { CollectionUtils } from "../../utils/collection";
import { Exercise } from "../../models/exercise";
import { IExportedProgram, Program } from "../../models/program";
import { getLatestMigrationVersion } from "../../migrations/migrations";
import { UrlUtils } from "../../utils/url";
import { IconSpinner } from "../../components/icons/iconSpinner";
import { lb } from "lens-shmens";

export interface IProgramContentListProps {
  service: Service;
  env: IEnv;
  storage: IStorage;
  account: IAccount;
  isMobile: boolean;
}

async function saveProgram(newProgram: IProgram, service: Service): Promise<void> {
  const exportedProgram: IExportedProgram = {
    program: newProgram,
    customExercises: {},
    settings: {},
    version: getLatestMigrationVersion(),
  };
  const result = await service.postSaveProgram(exportedProgram);
  if (result.success) {
    window.location.href = UrlUtils.build(
      `/user/p/${encodeURIComponent(result.data)}`,
      window.location.href
    ).toString();
  } else {
    alert("Error while saving the program, try again");
  }
}

async function deleteProgram(id: string, service: Service): Promise<boolean> {
  const result = await service.deleteProgram(id);
  if (result.success) {
    return true;
  } else {
    alert("Error while deleting the program, try again");
    return false;
  }
}

export function ProgramContentList(props: IProgramContentListProps): JSX.Element {
  const { storage } = props;

  const [showCreateProgramModal, setShowCreateProgramModal] = useState(false);
  const initialState = buildState({ storage, userId: props.account.id });
  const [state, dispatch] = useThunkReducer(reducerWrapper(false), initialState, props.env, []);
  const [isCreating, setIsCreating] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState<string | undefined>(undefined);
  const [isDeleting, setIsDeleting] = useState<string | undefined>(undefined);

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
            href="/planner"
            className="inline-block px-8 py-2 mt-2 text-xs font-semibold leading-6 text-white bg-purple-700 sm:mt-0 sm:ml-4 rounded-2xl nm-add-standalone-program"
            target="_blank"
          >
            New Standalone Program
          </a>
        </div>
      </div>
      <ul>
        {CollectionUtils.sortByExpr(state.storage.programs, (p) => p.clonedAt || 0, true).map((program) => {
          program = Program.fullProgram(program, state.storage.settings);
          const usedExerciseIds = new Set(program.days.flatMap((d) => d.exercises.map((e) => e.id)));
          const usedExercises = program.exercises.filter((e) => usedExerciseIds.has(e.id));

          return (
            <li className="mb-8">
              <div>
                <a
                  className={`text-lg font-bold text-bluev2 underline`}
                  target="_blank"
                  href={`/user/p/${encodeURIComponent(program.id)}`}
                >
                  {program.name}
                </a>
                <span className="ml-4">
                  <button
                    className="px-2 align-middle ls-programs-list-copy-program button"
                    disabled={isDuplicating === program.id}
                    onClick={async () => {
                      setIsDuplicating(program.id);
                      const newName = `${program.name} Copy`;
                      const newProgram: IProgram = {
                        ...program,
                        name: newName,
                        id: UidFactory.generateUid(8),
                        clonedAt: Date.now(),
                        planner: program.planner ? { ...program.planner, name: newName } : undefined,
                      };
                      try {
                        await saveProgram(newProgram, props.service);
                      } finally {
                        setIsDuplicating(undefined);
                      }
                    }}
                  >
                    {isDuplicating === program.id ? (
                      <IconSpinner color="black" width={16} height={16} />
                    ) : (
                      <IconDuplicate2 />
                    )}
                  </button>
                  <button
                    className="px-2 align-middle ls-programs-list-delete-program button"
                    disabled={isDeleting === program.id}
                    onClick={async () => {
                      if (state.storage.programs.length < 2) {
                        alert("You cannot delete all your programs, you should have at least one");
                      } else {
                        const confirmText =
                          state.storage.currentProgramId === program.id
                            ? "Are you sure? This will delete your current program!"
                            : "Are you sure?";
                        if (confirm(confirmText)) {
                          setIsDeleting(program.id);
                          try {
                            await deleteProgram(program.id, props.service);
                            updateState(dispatch, [
                              lb<IState>()
                                .p("storage")
                                .p("programs")
                                .recordModify((programs) => CollectionUtils.removeBy(programs, "id", program.id)),
                            ]);
                          } finally {
                            setIsDeleting(undefined);
                          }
                        }
                      }
                    }}
                  >
                    {isDeleting === program.id ? <IconSpinner color="black" width={16} height={16} /> : <IconTrash />}
                  </button>
                </span>
              </div>
              <div className="pt-2">
                {CollectionUtils.uniqByExpr(usedExercises, (e) => Exercise.toKey(e.exerciseType))
                  .filter((e) => ExerciseImageUtils.exists(e.exerciseType, "small"))
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
                {program.days.length} {StringUtils.pluralize("day", program.days.length)}, {usedExercises.length}{" "}
                {StringUtils.pluralize("exercise", usedExercises.length)}
              </div>
            </li>
          );
        })}
      </ul>
      {showCreateProgramModal && (
        <ModalCreateProgram
          isHidden={!showCreateProgramModal}
          isLoading={isCreating}
          onClose={() => setShowCreateProgramModal(false)}
          onSelect={async (name, isV2) => {
            if (isV2) {
              const newProgram = {
                ...Program.create(name),
                planner: {
                  name,
                  weeks: [{ name: "Week 1", days: [{ name: "Day 1", exerciseText: "" }] }],
                },
              };
              setIsCreating(true);
              try {
                await saveProgram(newProgram, props.service);
              } finally {
                setIsCreating(false);
              }
            } else {
              dispatch({ type: "CreateProgramAction", name });
            }
            setShowCreateProgramModal(false);
          }}
        />
      )}
    </div>
  );
}
