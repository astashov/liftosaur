import { lb } from "lens-shmens";
import { h, JSX, Fragment } from "preact";
import { DraggableList } from "../../../components/draggableList";
import { ExerciseImage } from "../../../components/exerciseImage";
import { GroupHeader } from "../../../components/groupHeader";
import { IconDuplicate2 } from "../../../components/icons/iconDuplicate2";
import { IconHandle } from "../../../components/icons/iconHandle";
import { IconTrash } from "../../../components/icons/iconTrash";
import { LinkButton } from "../../../components/linkButton";
import { EditProgramLenses } from "../../../models/editProgramLenses";
import { Program } from "../../../models/program";
import { IProgram, ISettings } from "../../../types";
import { CollectionUtils } from "../../../utils/collection";
import { ObjectUtils } from "../../../utils/object";
import { StringUtils } from "../../../utils/string";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { BuilderLinkInlineInput } from "../../builder/components/builderInlineInput";
import { IProgramEditorState } from "../models/types";

interface IProgramContentEditWeeksProps {
  program: IProgram;
  settings: ISettings;
  onShowManageDaysModal: (weekIndex: number) => void;
  dispatch: ILensDispatch<IProgramEditorState>;
}

export function ProgramContentEditWeeks(props: IProgramContentEditWeeksProps): JSX.Element {
  const { program, dispatch, onShowManageDaysModal } = props;
  const lbProgram = lb<IProgramEditorState>().p("current").p("program");
  return (
    <>
      <GroupHeader name="Weeks" />
      <DraggableList
        hideBorders={true}
        items={program.weeks}
        element={(week, i, handleTouchStart) => {
          return (
            <section className="flex w-full px-2 py-1 text-left">
              <div className="flex flex-col">
                <div className="p-2 cursor-move" style={{ marginLeft: "-16px", touchAction: "none" }}>
                  <span onMouseDown={handleTouchStart} onTouchStart={handleTouchStart}>
                    <IconHandle />
                  </span>
                </div>
                <div className="flex-1">
                  <div className="h-full bg-grayv2-200" style={{ width: "1px" }} />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex">
                  <h2 className="flex items-center flex-1 mr-2" style={{ height: "2.25rem" }}>
                    <span className="text-xl">
                      <BuilderLinkInlineInput
                        value={week.name}
                        onInputString={(v) => {
                          dispatch(lbProgram.p("weeks").i(i).p("name").record(v));
                        }}
                      />
                    </span>
                  </h2>
                  <div>
                    <button
                      title="Duplicate week"
                      data-cy={`menu-item-duplicate-week-${StringUtils.dashcase(week.name)}`}
                      className="px-2 align-middle ls-web-editor-duplicate-week button"
                      onClick={() => {
                        const newName = StringUtils.nextName(week.name);
                        dispatch(
                          lbProgram.p("weeks").recordModify((weeks) => {
                            const newWeeks = [...weeks];
                            newWeeks.push({ ...ObjectUtils.clone(week), name: newName });
                            return newWeeks;
                          })
                        );
                      }}
                    >
                      <IconDuplicate2 />
                    </button>
                    {program.weeks.length > 1 && (
                      <button
                        title="Remove week"
                        data-cy={`menu-item-delete-${StringUtils.dashcase(week.name)}`}
                        className="px-2 align-middle ls-web-editor-delete-week button"
                        onClick={() => {
                          dispatch(lbProgram.p("weeks").recordModify((days) => CollectionUtils.removeAt(days, i)));
                        }}
                      >
                        <IconTrash />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <DraggableList
                    hideBorders={true}
                    items={week.days}
                    element={(day, i2, handleTouchStart2) => {
                      const programDay = program.days.find((d) => d.id === day.id);
                      if (!programDay) {
                        return <></>;
                      }
                      return (
                        <div className="relative my-1">
                          <div className="flex items-center px-4 py-1">
                            {handleTouchStart2 && (
                              <div
                                className="p-2 mr-1 cursor-move"
                                style={{ marginLeft: "-16px", touchAction: "none" }}
                              >
                                <span onMouseDown={handleTouchStart2} onTouchStart={handleTouchStart2}>
                                  <IconHandle />
                                </span>
                              </div>
                            )}
                            <div className="flex items-center flex-1">
                              <div className="mr-2 text-lg">{programDay.name}</div>
                              {programDay.exercises.map((exercise) => {
                                const programExercise = program.exercises.find((e) => e.id === exercise.id);
                                if (!programExercise) {
                                  return null;
                                }
                                return (
                                  <div>
                                    <ExerciseImage
                                      settings={props.settings}
                                      className="w-6 mr-3"
                                      exerciseType={programExercise.exerciseType}
                                      size="small"
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    }}
                    onDragEnd={(startIndex, endIndex) =>
                      dispatch(EditProgramLenses.reorderDaysWithinWeek(lbProgram, i, startIndex, endIndex))
                    }
                  />
                </div>
                <div>
                  <LinkButton name="program-content-weeks-manage-days" onClick={() => onShowManageDaysModal(i)}>
                    Manage days in {week.name}
                  </LinkButton>
                </div>
              </div>
            </section>
          );
        }}
        onDragEnd={(startIndex, endIndex) => {
          dispatch(EditProgramLenses.reorderWeeks(lbProgram, startIndex, endIndex));
        }}
      />
      <LinkButton
        name="program-content-weeks-add-week"
        onClick={() => {
          dispatch(
            lbProgram.p("weeks").recordModify((weeks) => {
              return [...weeks, Program.createWeek(StringUtils.nextName(program.weeks[program.weeks.length - 1].name))];
            })
          );
        }}
      >
        Add new week
      </LinkButton>
      <GroupHeader name="Days" topPadding={true} />
    </>
  );
}
