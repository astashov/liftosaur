import { ComponentChildren, h, JSX, Ref } from "preact";
import { useRef, useState, useEffect } from "preact/hooks";
import { ExerciseImage } from "../../components/exerciseImage";
import { ExerciseItem } from "../../components/modalExercise";
import { Multiselect } from "../../components/multiselect";
import { equipmentName, Exercise, IExercise } from "../../models/exercise";
import { Settings } from "../../models/settings";
import { equipments, exerciseKinds, IExerciseType, IMuscle, screenMuscles } from "../../types";
import { StringUtils } from "../../utils/string";
import { muscleDescriptions } from "../../models/muscleDescriptions";
import { Muscle } from "../../models/muscle";
import { exerciseDescriptions } from "../../models/exerciseDescriptions";
import { Markdown } from "../../components/markdown";
import { forwardRef } from "preact/compat";
import { UrlUtils } from "../../utils/url";
import { ScrollableTabs } from "../../components/scrollableTabs";
import { GroupHeader } from "../../components/groupHeader";
import { TopNavMenu } from "../../components/topNavMenu";
import { IAccount } from "../../models/account";
import { FooterPage } from "../../components/footerPage";
import { IconMuscles2 } from "../../components/icons/iconMuscles2";
import { IconDoc } from "../../components/icons/iconDoc";
import { Modal } from "../../components/modal";

export interface IExerciseContentProps {
  account?: IAccount;
  client: Window["fetch"];
  exerciseType: IExerciseType;
  filterTypes: string[];
}

export function buildExerciseUrl(exerciseType: IExerciseType, filterTypes: string[]): string {
  const url = UrlUtils.build(`/exercises/${Exercise.toUrlSlug(exerciseType)}`, "https://www.liftosaur.com");
  const filterTypesParam = filterTypes.join(",");
  if (filterTypesParam) {
    url.searchParams.set("filtertypes", filterTypes.join(",").toLowerCase());
  } else {
    url.searchParams.delete("filtertypes");
  }
  return `${url.pathname}${url.search}`;
}

export function ExerciseContent(props: IExerciseContentProps): JSX.Element {
  const [exerciseType, setExerciseType] = useState<IExerciseType>(props.exerciseType);
  const [filterTypes, setFilterTypes] = useState<string[]>(props.filterTypes);
  const [isMusclesOpen, setIsMusclesOpen] = useState(false);
  const [isExercisesOpen, setIsExercisesOpen] = useState(false);
  const exercise = Exercise.get(exerciseType, {});
  const name = Exercise.reverseName(exercise);
  const column1Ref = useRef<HTMLDivElement>(null);
  const column2Ref = useRef<HTMLDivElement>(null);
  const column3Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const maxHeight = Math.max(column2Ref.current?.scrollHeight || 0, column3Ref.current?.scrollHeight || 0);
    const c1 = column1Ref.current;
    if (c1) {
      c1.style.setProperty("height", `${maxHeight}px`);
    }
  });

  useEffect(() => {
    const onPopState = (e: PopStateEvent): void => {
      if (e.state.exerciseType) {
        setExerciseType(e.state.exerciseType);
      }
      if (e.state.filterTypes) {
        setFilterTypes(e.state.filterTypes);
      }
    };
    window.addEventListener("popstate", onPopState);
    setTimeout(() => {
      window.history.replaceState(
        { exerciseType: props.exerciseType },
        "",
        buildExerciseUrl(props.exerciseType, props.filterTypes)
      );
    }, 0);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, []);
  const maxWidth = 1200;

  return (
    <div>
      <TopNavMenu
        maxWidth={maxWidth}
        current="/exercises"
        account={props.account}
        client={props.client}
        mobileRight={
          <div className="flex items-center gap-2">
            <div>
              <button className="p-2 align-middle nm-navbar-muscles" onClick={() => setIsMusclesOpen(true)}>
                <IconMuscles2 size={24} />
              </button>
            </div>
            <div>
              <button className="p-2 align-middle nm-navbar-exercises" onClick={() => setIsExercisesOpen(true)}>
                <IconDoc width={19} height={24} />
              </button>
            </div>
          </div>
        }
      />

      <div id="app" style={{ maxWidth, margin: "0 auto", width: "100%" }}>
        <div className="flex flex-row-reverse items-stretch gap-8 px-4">
          <div className="hidden w-48 h-auto md:w-64 sm:block">
            <div ref={column3Ref}>
              <MuscleGroups insideModal={false} exerciseType={exerciseType} setFilterTypes={setFilterTypes} />
            </div>
          </div>
          <div className="flex-1 h-auto">
            <div ref={column2Ref}>
              <ExerciseDescription exerciseType={exerciseType} name={name} />
            </div>
          </div>
          <div className="hidden w-48 md:w-64 sm:block">
            <div className="text-lg font-bold">Exercises</div>
            <ExerciseListWrapper
              ref={column1Ref}
              exercise={exercise}
              filterTypes={filterTypes}
              insideModal={false}
              setFilterTypes={setFilterTypes}
              onChange={(newExerciseType) => {
                window.history.pushState(
                  { exerciseType: newExerciseType, filterTypes },
                  "",
                  buildExerciseUrl(newExerciseType, filterTypes)
                );
                setExerciseType(newExerciseType);
              }}
            />
          </div>
        </div>
      </div>
      <FooterPage maxWidth={maxWidth} account={props.account} />
      {isMusclesOpen && (
        <Modal onClose={() => setIsMusclesOpen(false)} shouldShowClose={true} isFullWidth={true}>
          <MuscleGroups
            insideModal={true}
            exerciseType={exerciseType}
            setFilterTypes={(ft) => {
              setFilterTypes(ft);
              setIsExercisesOpen(true);
              setIsMusclesOpen(false);
            }}
          />
        </Modal>
      )}
      {isExercisesOpen && (
        <Modal onClose={() => setIsExercisesOpen(false)} shouldShowClose={true} isFullWidth={true}>
          <div className="w-full text-lg font-bold text-center">Exercises</div>
          <ExerciseListWrapper
            insideModal={true}
            ref={column1Ref}
            exercise={exercise}
            filterTypes={filterTypes}
            setFilterTypes={setFilterTypes}
            onChange={(newExerciseType) => {
              window.history.pushState(
                { exerciseType: newExerciseType, filterTypes },
                "",
                buildExerciseUrl(newExerciseType, filterTypes)
              );
              setExerciseType(newExerciseType);
              setIsExercisesOpen(false);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

interface IExerciseDescriptionProps {
  exerciseType: IExerciseType;
  name: string;
}

function ExerciseDescription(props: IExerciseDescriptionProps): JSX.Element {
  const key = Exercise.toKey(props.exerciseType).toLowerCase();
  const content = exerciseDescriptions[key]?.content;
  const video = exerciseDescriptions[key]?.video;
  if (!content) {
    return <div />;
  }
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">How to perform {props.name} with proper form</h1>
      <div className="relative w-full mb-4" style={{ paddingBottom: video ? "56.25%" : 0 }}>
        <div className="absolute inset-0">
          <YoutubePlayer video={video} />
        </div>
      </div>
      <Markdown className="exercise-description-markdown" value={content} />
    </div>
  );
}

export interface IExercisesListProps {
  exercise: IExercise;
  insideModal: boolean;
  isSubstitute: boolean;
  filterTypes: string[];
  setFilterTypes: (filterTypes: string[]) => void;
  onChange: (exerciseType: IExerciseType) => void;
}

const ExerciseListWrapper = forwardRef(
  (props: Omit<IExercisesListProps, "isSubstitute">, ref: Ref<HTMLDivElement>): JSX.Element => {
    const tabs = ["Select", "Substitute"];
    return (
      <ScrollableTabs
        defaultIndex={0}
        tabs={tabs.map((name) => {
          if (name === "Select") {
            return {
              label: name,
              children: <ExercisesList ref={ref} isSubstitute={false} {...props} />,
            };
          } else {
            return {
              label: name,
              children: <ExercisesList ref={ref} isSubstitute={true} {...props} />,
            };
          }
        })}
      />
    );
  }
);

const ExercisesList = forwardRef((props: IExercisesListProps, ref: Ref<HTMLDivElement>): JSX.Element => {
  const { setFilterTypes, filterTypes } = props;
  const textInput = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<string>("");
  const [length, setLength] = useState<number | undefined>(20);
  const settings = Settings.build();
  const exercises = Exercise.filterExercisesByNameAndType(
    settings,
    filter,
    filterTypes,
    props.isSubstitute,
    props.exercise,
    length
  );
  useEffect(() => {
    setLength(undefined);
  }, []);

  const filterOptions = [
    ...equipments.map((e) => equipmentName(e)),
    ...exerciseKinds.map(StringUtils.capitalize),
    ...screenMuscles.map(StringUtils.capitalize),
  ];

  const selectedOptions = new Set(
    filterOptions.filter((ft) => filterTypes.map((t) => t.toLowerCase()).indexOf(ft.toLowerCase()) !== -1)
  );

  return (
    <div className="h-full pb-8">
      <form data-cy="exercises-list" onSubmit={(e) => e.preventDefault()}>
        <input
          ref={textInput}
          className="block w-full px-4 py-2 mb-2 text-base leading-normal bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:shadow-outline"
          type="text"
          value={filter}
          placeholder="Filter by name"
          onInput={() => {
            setFilter(textInput.current.value.toLowerCase());
          }}
        />
        <Multiselect
          id="filtertypes"
          key={Array.from(selectedOptions).join(",")}
          label=""
          placeholder="Filter by type"
          values={filterOptions}
          initialSelectedValues={selectedOptions}
          onChange={(ft) => {
            const newFilterTypes = Array.from(ft);
            setFilterTypes(newFilterTypes);
            window.history.pushState(
              {
                exerciseType: props.exercise,
                filterTypes: newFilterTypes,
              },
              "",
              buildExerciseUrl(props.exercise, newFilterTypes)
            );
          }}
        />
      </form>

      {props.isSubstitute && (
        <div className="px-4 py-2 mb-2 bg-purple-100 rounded-2xl">
          <GroupHeader name="Current" />
          <ExerciseItem
            showMuscles={props.isSubstitute}
            settings={settings}
            exercise={props.exercise}
            equipment={props.exercise.equipment}
          />
        </div>
      )}

      <div ref={props.insideModal ? undefined : ref} className={`${props.insideModal ? "" : "h-0"} overflow-y-auto`}>
        {exercises.map((exercise) => {
          const key = Exercise.toKey(exercise);
          const currentKey = Exercise.toKey(props.exercise);
          return (
            <a
              href={buildExerciseUrl(exercise, filterTypes)}
              className={`block px-2 rounded-lg hover:bg-grayv2-100 border ${
                key === currentKey ? "bg-orange-100 border-orange-200" : "border-transparent"
              }`}
              key={key}
              onClick={(e) => {
                e.preventDefault();
                props.onChange(exercise);
              }}
            >
              <ExerciseItem
                exercise={exercise}
                settings={settings}
                showMuscles={props.isSubstitute}
                currentExerciseType={props.exercise}
                equipment={exercise.equipment}
              />
            </a>
          );
        })}
      </div>
    </div>
  );
});

interface IMuscleGroupItemProps {
  type: string;
  exerciseType: IExerciseType;
  setFilterTypes: (filterTypes: string[]) => void;
}

function MuscleGroupItem(props: IMuscleGroupItemProps): JSX.Element {
  return (
    <li>
      <a
        href={buildExerciseUrl(props.exerciseType, [props.type])}
        onClick={(e) => {
          e.preventDefault();
          props.setFilterTypes([props.type]);
          window.history.pushState(
            {
              exerciseType: props.exerciseType,
              filterTypes: [props.type],
            },
            "",
            buildExerciseUrl(props.exerciseType, [props.type])
          );
        }}
        className="underline text-bluev2"
      >
        {props.type}
      </a>
    </li>
  );
}

export interface IMuscleGroupsProps {
  insideModal: boolean;
  exerciseType: IExerciseType;
  setFilterTypes: (filterTypes: string[]) => void;
}

function MuscleGroups(props: IMuscleGroupsProps): JSX.Element {
  const exercise = Exercise.get(props.exerciseType, {});
  const targetMuscleGroups = Exercise.targetMusclesGroups(exercise, {}).map((m) => StringUtils.capitalize(m));
  const synergistMuscleGroups = Exercise.synergistMusclesGroups(exercise, {})
    .map((m) => StringUtils.capitalize(m))
    .filter((m) => targetMuscleGroups.indexOf(m) === -1);
  const targetMuscles = Exercise.targetMuscles(exercise, {});
  const synergistMuscles = Exercise.synergistMuscles(exercise, {}).filter((m) => targetMuscles.indexOf(m) === -1);
  const [selectedMuscle, setSelectedMuscle] = useState<[IMuscle, boolean] | undefined>(undefined);

  const types = exercise.types.map((t) => StringUtils.capitalize(t));

  return (
    <div className="pb-8">
      <ExerciseImage size="large" exerciseType={props.exerciseType} />
      <div className="pb-1 text-lg font-bold">Muscle Groups</div>
      <div className="pb-8">
        <div className="font-bold">Type</div>
        <ul className="pb-2 ml-4 list-disc">
          {types.map((t) => {
            return <MuscleGroupItem type={t} exerciseType={props.exerciseType} setFilterTypes={props.setFilterTypes} />;
          })}
        </ul>
        <div className="font-bold">Target</div>
        <ul className="pb-2 ml-4 list-disc">
          {targetMuscleGroups.map((m) => (
            <MuscleGroupItem type={m} exerciseType={props.exerciseType} setFilterTypes={props.setFilterTypes} />
          ))}
        </ul>
        <div className="font-bold">Synergist</div>
        <ul className="pb-2 ml-4 list-disc">
          {synergistMuscleGroups.map((m) => (
            <MuscleGroupItem type={m} exerciseType={props.exerciseType} setFilterTypes={props.setFilterTypes} />
          ))}
        </ul>
      </div>
      <div className="pb-1 text-lg font-bold">Muscles</div>
      <div>
        <div className="font-bold">Target</div>
        <ul className="pb-2 ml-4 list-disc">
          {targetMuscles.map((m) => (
            <li className="relative">
              <MuscleView
                insideModal={props.insideModal}
                muscle={m}
                selectedMuscle={selectedMuscle}
                setSelectedMuscle={setSelectedMuscle}
              />
            </li>
          ))}
        </ul>
        <div className="font-bold">Synergist</div>
        <ul className="pb-2 ml-4 list-disc">
          {synergistMuscles.map((m) => (
            <li className="relative">
              <MuscleView
                insideModal={props.insideModal}
                muscle={m}
                selectedMuscle={selectedMuscle}
                setSelectedMuscle={setSelectedMuscle}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

interface IMuscleViewProps {
  selectedMuscle?: [IMuscle, boolean];
  insideModal: boolean;
  muscle: IMuscle;
  setSelectedMuscle: (payload?: [IMuscle, boolean]) => void;
}

function MuscleView(props: IMuscleViewProps): JSX.Element {
  const { selectedMuscle, muscle, setSelectedMuscle } = props;
  return (
    <div>
      <span className="relative hidden sm:inline">
        {selectedMuscle?.[0] === muscle && (
          <DropdownMenu
            onTop={props.insideModal}
            noPointerEvents={!!selectedMuscle?.[1]}
            onClose={() => setSelectedMuscle(undefined)}
          >
            <MuscleDescription muscle={muscle} insideModal={props.insideModal} />
          </DropdownMenu>
        )}
      </span>
      <span className="relative inline sm:hidden">
        {selectedMuscle?.[0] === muscle && (
          <Modal onClose={() => setSelectedMuscle(undefined)} shouldShowClose={true} isFullWidth={true}>
            <MuscleDescription muscle={muscle} insideModal={props.insideModal} />
          </Modal>
        )}
      </span>
      <button
        className="underline"
        style={{ cursor: "help" }}
        onClick={() => setSelectedMuscle([muscle, false])}
        onMouseOver={props.insideModal ? undefined : () => setSelectedMuscle([muscle, true])}
        onMouseLeave={props.insideModal ? undefined : () => setSelectedMuscle(undefined)}
      >
        {muscle}
      </button>
    </div>
  );
}

function MuscleDescription(props: { muscle: IMuscle; insideModal: boolean }): JSX.Element {
  return (
    <div className="px-2 py-4 pr-4" style={{ width: props.insideModal ? "100%" : "560px" }}>
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="w-full text-center sm:w-48" style={{ minHeight: "8rem" }}>
          <img src={Muscle.imageUrl(props.muscle)} className="inline-block w-32 sm:w-full" />
        </div>
        <div className="flex-1 text-left">
          <div className="font-bold">{props.muscle}</div>
          <div>
            {muscleDescriptions[props.muscle].map((d) => (
              <p className="mb-2">{d}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DropdownMenu(props: {
  onTop: boolean;
  noPointerEvents?: boolean;
  children: ComponentChildren;
  onClose: () => void;
}): JSX.Element {
  return (
    <section className="" style={{ zIndex: 100 }}>
      <div
        data-name="overlay"
        className={`fixed inset-0 z-10 overflow-scroll scrolling-touch ${
          props.noPointerEvents ? "pointer-events-none" : ""
        }`}
        onClick={props.onClose}
        style={{ backgroundColor: "rgba(0, 0, 0, 0.05)" }}
      />
      <div
        className={`absolute shadow rounded`}
        style={props.onTop ? { bottom: "0", left: "-2.5rem" } : { top: "-130px", right: "2.5rem" }}
      >
        <div className={`relative h-full z-20 bg-white rounded p-2 text-right`}>{props.children}</div>
        <div className="add-tip" style={{ zIndex: 10, top: "135px" }} />
      </div>
    </section>
  );
}

function YoutubePlayer(props: { video?: string }): JSX.Element {
  const [player, setPlayer] = useState<YT.Player | undefined>(undefined);
  useEffect(() => {
    const tag = document.createElement("script");

    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName("script")[0];
    const parentNode = firstScriptTag.parentNode;
    if (parentNode) {
      parentNode.insertBefore(tag, firstScriptTag);
    }

    window.onYouTubeIframeAPIReady = () => {
      const aPlayer = new window.YT.Player("exercise-youtube-player", {
        height: "100%",
        width: "100%",
        events: {
          onReady: () => {
            setPlayer(aPlayer);
          },
        },
      });
    };
  }, []);

  useEffect(() => {
    if (player) {
      if (props.video) {
        player.loadVideoById(props.video);
      }
      player.stopVideo();
    }
  }, [player, props.video]);

  return <div id="exercise-youtube-player" className="w-full h-full" />;
}
